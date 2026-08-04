from datetime import timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.db.models import Count, F, Q, Sum
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework.exceptions import ValidationError

from apps.accounts.models import User
from apps.admissions.models import PatientVisit
from apps.appointments.models import Appointment
from apps.billing.models import CashSession, ClinicFiscalProfile, FiscalDocumentRange, Invoice, Payment
from apps.clinic_settings.models import get_or_create_clinic_settings, get_or_create_workflow_settings
from apps.doctors.models import DoctorProfile
from apps.hospitalization.models import Hospitalization
from apps.inventory.models import InventoryItem, InventoryLot
from apps.security.models import AccountLock, UserSession


MAX_CUSTOM_RANGE_DAYS = 92


def clinic_local_date(clinic, clinic_settings=None):
    clinic_settings = clinic_settings or get_or_create_clinic_settings(clinic)
    try:
        return timezone.now().astimezone(ZoneInfo(clinic_settings.timezone)).date()
    except (ValueError, ZoneInfoNotFoundError):
        return timezone.localdate()


def admin_metric_period(request, clinic, clinic_settings=None):
    clinic_settings = clinic_settings or get_or_create_clinic_settings(clinic)
    today = clinic_local_date(clinic, clinic_settings)
    period = str(request.query_params.get("period") or "today").strip().lower()
    if period == "today":
        date_from = date_to = today
    elif period in {"7d", "last_7_days"}:
        date_from, date_to = today - timedelta(days=6), today
        period = "7d"
    elif period in {"month", "this_month"}:
        date_from, date_to = today.replace(day=1), today
        period = "month"
    elif period == "custom":
        date_from = parse_date(str(request.query_params.get("date_from") or ""))
        date_to = parse_date(str(request.query_params.get("date_to") or ""))
        if not date_from or not date_to:
            raise ValidationError({"detail": "Indica fecha inicial y fecha final válidas."})
    else:
        raise ValidationError({"period": "Usa today, 7d, month o custom."})
    if date_from > date_to:
        raise ValidationError({"date_to": "La fecha final debe ser igual o posterior a la inicial."})
    if (date_to - date_from).days + 1 > MAX_CUSTOM_RANGE_DAYS:
        raise ValidationError({"date_to": f"El rango no puede superar {MAX_CUSTOM_RANGE_DAYS} días."})
    if date_to > today:
        raise ValidationError({"date_to": "La fecha final no puede estar en el futuro."})
    return {
        "key": period,
        "date_from": date_from,
        "date_to": date_to,
        "timezone": clinic_settings.timezone,
    }


def build_clinic_admin_dashboard(request, clinic):
    clinic_settings = get_or_create_clinic_settings(clinic)
    period = admin_metric_period(request, clinic, clinic_settings)
    date_from = period["date_from"]
    date_to = period["date_to"]
    today = clinic_local_date(clinic, clinic_settings)
    users = User.objects.filter(clinica=clinic).exclude(role__nombre="superadmin")
    appointments = Appointment.objects.filter(clinic=clinic, scheduled_date__range=(date_from, date_to))
    visits = PatientVisit.objects.filter(clinic=clinic, visit_date__range=(date_from, date_to), active=True)
    invoices = Invoice.objects.filter(clinic=clinic, issue_date__range=(date_from, date_to), active=True).exclude(status=Invoice.Status.ANULADA)
    payments = Payment.objects.filter(clinic=clinic, payment_date__range=(date_from, date_to), active=True, status=Payment.Status.APLICADO)
    inventory = InventoryItem.objects.filter(clinic=clinic, active=True)
    lots = InventoryLot.objects.filter(clinic=clinic, active=True, quantity_current__gt=0)
    expiring_limit = today + timedelta(days=30)
    active_sessions = UserSession.objects.filter(
        user__clinica=clinic,
        user__is_active=True,
        active=True,
        expires_at__gt=timezone.now(),
    ).exclude(user__role__nombre="superadmin")
    fiscal_enabled = ClinicFiscalProfile.objects.filter(
        clinic=clinic, is_fiscal_billing_enabled=True
    ).exists()
    valid_fiscal_range = FiscalDocumentRange.objects.filter(
        clinic=clinic,
        document_type=FiscalDocumentRange.DocumentType.INVOICE,
        is_active=True,
        is_exhausted=False,
        expiration_date__gte=today,
    ).exists()
    workflow = get_or_create_workflow_settings(clinic)
    cash_sessions = CashSession.objects.filter(clinic=clinic, active=True)
    cash_metrics = cash_sessions.aggregate(
        open_count=Count("id", filter=Q(status=CashSession.Status.ABIERTA)),
        differences=Count(
            "id",
            filter=Q(
                status=CashSession.Status.CERRADA,
                closing_datetime__date__range=(date_from, date_to),
            ) & ~Q(difference_amount=0),
        ),
    )
    appointment_metrics = appointments.aggregate(
        total=Count("id"),
        attended=Count("id", filter=Q(status=Appointment.Status.ATENDIDA)),
        cancelled=Count("id", filter=Q(status=Appointment.Status.CANCELADA)),
        no_show=Count("id", filter=Q(status=Appointment.Status.NO_ASISTIO)),
    )
    visit_metrics = visits.aggregate(
        waiting=Count("id", filter=Q(status__in=[PatientVisit.Status.WAITING_TRIAGE, PatientVisit.Status.WAITING_DOCTOR])),
        in_consultation=Count("id", filter=Q(status=PatientVisit.Status.IN_CONSULTATION)),
    )
    invoice_metrics = invoices.aggregate(
        invoiced=Sum("total_amount"),
        balance_due=Sum("balance_due"),
    )
    payment_metrics = payments.aggregate(paid=Sum("amount"))
    inventory_metrics = inventory.aggregate(
        out_of_stock=Count("id", filter=Q(stock_current=0)),
        low_stock=Count("id", filter=Q(stock_current__gt=0, stock_current__lte=F("stock_minimum"))),
    )
    lot_metrics = lots.aggregate(
        expiring=Count("id", filter=Q(expiration_date__range=(today, expiring_limit))),
        expired=Count("id", filter=Q(expiration_date__lt=today)),
    )
    user_metrics = users.aggregate(
        total=Count("id"),
        active=Count("id", filter=Q(is_active=True)),
        inactive=Count("id", filter=Q(is_active=False)),
    )
    active_doctors = DoctorProfile.objects.filter(clinic=clinic, activo=True, user__is_active=True).count()
    active_sessions_count = active_sessions.count()
    active_locks = AccountLock.objects.filter(user__clinica=clinic, active=True, locked_until__gt=timezone.now()).count()
    hospitalized = Hospitalization.objects.filter(clinic=clinic, status__in=Hospitalization.ACTIVE_STATUSES).count()
    open_cash_exists = cash_metrics["open_count"] > 0

    # Normalize nullable SQL sums once so the response contract remains decimal-based.
    zero = Decimal("0.00")

    return {
        "clinic": {
            "id": clinic.id,
            "nombre": clinic.nombre,
            "activo": clinic.activo,
        },
        "period": period,
        "operation": {
            "appointments_scheduled": appointment_metrics["total"],
            "appointments_attended": appointment_metrics["attended"],
            "appointments_cancelled": appointment_metrics["cancelled"],
            "appointments_no_show": appointment_metrics["no_show"],
            "patients_waiting": visit_metrics["waiting"],
            "patients_in_consultation": visit_metrics["in_consultation"],
            "patients_hospitalized": hospitalized,
        },
        "finance": {
            "invoiced": invoice_metrics["invoiced"] or zero,
            "paid": payment_metrics["paid"] or zero,
            "balance_due": invoice_metrics["balance_due"] or zero,
            "open_cash_sessions": cash_metrics["open_count"],
            "cash_differences": cash_metrics["differences"],
        },
        "inventory": {
            "out_of_stock": inventory_metrics["out_of_stock"],
            "low_stock": inventory_metrics["low_stock"],
            "expiring_lots": lot_metrics["expiring"],
            "expired_lots": lot_metrics["expired"],
        },
        "users": {
            "total": user_metrics["total"],
            "active": user_metrics["active"],
            "inactive": user_metrics["inactive"],
            "active_doctors": active_doctors,
            "active_sessions": active_sessions_count,
            "active_locks": active_locks,
        },
        "operation_status": {
            "clinic_active": clinic.activo,
            "patient_portal_active": clinic_settings.allow_patient_portal,
            "online_appointments_active": clinic_settings.allow_online_appointments and workflow.allow_online_appointments,
            "in_person_appointments_active": workflow.allow_in_person_appointments,
            "cash_open": open_cash_exists,
            "valid_fiscal_range": valid_fiscal_range,
            "fiscal_billing_enabled": fiscal_enabled,
            "last_updated": timezone.now(),
        },
    }


def build_clinic_admin_alerts(clinic):
    today = clinic_local_date(clinic)
    now = timezone.now()
    alerts = []

    def add(key, title, category, severity, count, resource_type, detail):
        if count:
            alerts.append({
                "key": key,
                "title": title,
                "category": category,
                "severity": severity,
                "count": count,
                "status": "active",
                "resource_type": resource_type,
                "detail": detail,
                "created_at": now,
                "acknowledge_supported": False,
            })

    inventory = InventoryItem.objects.filter(clinic=clinic, active=True)
    lots = InventoryLot.objects.filter(clinic=clinic, active=True, quantity_current__gt=0)
    add("inventory-out", "Productos agotados", "inventory", "critical", inventory.filter(stock_current=0).count(), "inventory", "Revisa existencias y órdenes de compra.")
    add("inventory-low", "Productos bajo mínimo", "inventory", "warning", inventory.filter(stock_current__gt=0, stock_current__lte=F("stock_minimum")).count(), "inventory", "Hay productos por debajo del nivel mínimo configurado.")
    add("lots-expired", "Lotes vencidos", "inventory", "critical", lots.filter(expiration_date__lt=today).count(), "inventory_lots", "Retira o bloquea los lotes vencidos antes de utilizarlos.")
    add("lots-expiring", "Lotes próximos a vencer", "inventory", "warning", lots.filter(expiration_date__range=(today, today + timedelta(days=30))).count(), "inventory_lots", "Hay lotes que vencen durante los próximos 30 días.")
    add("account-locks", "Cuentas bloqueadas", "security", "warning", AccountLock.objects.filter(user__clinica=clinic, active=True, locked_until__gt=now).count(), "account_locks", "Revisa intentos fallidos antes de desbloquear una cuenta.")
    add("cash-open-long", "Cajas abiertas por tiempo prolongado", "cash", "warning", CashSession.objects.filter(clinic=clinic, status=CashSession.Status.ABIERTA, active=True, opening_datetime__lt=now - timedelta(hours=12)).count(), "cash_sessions", "Verifica el turno y realiza el cierre correspondiente.")
    add("cash-difference", "Diferencias recientes de caja", "cash", "warning", CashSession.objects.filter(clinic=clinic, status=CashSession.Status.CERRADA, active=True, closing_datetime__date__gte=today - timedelta(days=7)).exclude(difference_amount=0).count(), "cash_sessions", "Revisa los arqueos con diferencia de los últimos siete días.")
    add("waiting-long", "Pacientes con espera elevada", "appointments", "warning", PatientVisit.objects.filter(clinic=clinic, visit_date=today, active=True, status__in=[PatientVisit.Status.WAITING_TRIAGE, PatientVisit.Status.WAITING_DOCTOR], arrival_time__lt=now - timedelta(minutes=60)).count(), "patient_visits", "Hay pacientes que superan una hora de espera.")

    profile = ClinicFiscalProfile.objects.filter(clinic=clinic).first()
    if not profile or not profile.is_fiscal_billing_enabled:
        add("fiscal-profile", "Configuración fiscal incompleta", "fiscal", "warning", 1, "fiscal_settings", "La facturación fiscal no está habilitada o no tiene un perfil completo.")
    ranges = FiscalDocumentRange.objects.filter(clinic=clinic, document_type=FiscalDocumentRange.DocumentType.INVOICE)
    add("fiscal-expiring", "Rango fiscal próximo a vencer", "fiscal", "critical", ranges.filter(is_active=True, is_exhausted=False, expiration_date__range=(today, today + timedelta(days=30))).count(), "fiscal_ranges", "La fecha límite de emisión está próxima.")
    add("fiscal-low", "Rango fiscal próximo a agotarse", "fiscal", "warning", ranges.filter(is_active=True, is_exhausted=False, current_number__lte=F("end_number"), current_number__gte=F("end_number") - 20).count(), "fiscal_ranges", "Quedan veinte correlativos o menos en un rango activo.")
    if not ranges.filter(is_active=True, is_exhausted=False, expiration_date__gte=today).exists():
        add("fiscal-missing", "Sin rango fiscal vigente", "fiscal", "critical", 1, "fiscal_ranges", "No existe un rango de facturas activo y vigente.")

    severity_order = {"critical": 0, "error": 1, "warning": 2, "info": 3}
    return sorted(alerts, key=lambda item: (severity_order.get(item["severity"], 9), item["title"]))
