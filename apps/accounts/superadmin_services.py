import hashlib
import json
import os
from datetime import timedelta
from pathlib import Path

from django.conf import settings
from django.db import connection
from django.db.models import Count, IntegerField, OuterRef, Q, Subquery, Value
from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.accounts.models import User
from apps.appointments.models import Appointment
from apps.audit.models import AuditLog
from apps.billing.models import Invoice
from apps.clinics.models import Clinic
from apps.doctors.models import DoctorProfile
from apps.hospitalization.models import Hospitalization
from apps.medical_records.models import ClinicalConsultation
from apps.patients.models import Patient
from apps.security.models import UserSession
from apps.subscriptions.models import ClinicSubscription


PERIOD_DAYS = {
    "today": 0,
    "7d": 6,
    "30d": 29,
    "month": None,
}


def clinic_creation_fingerprint(data):
    normalized = "|".join(
        str(data.get(field) or "").strip().casefold()
        for field in ("nombre", "rtn", "correo")
    )
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def resolve_metric_period(params):
    today = timezone.localdate()
    period = str(params.get("period") or "30d").strip().lower()
    date_from = params.get("date_from")
    date_to = params.get("date_to")

    if date_from or date_to:
        if not date_from or not date_to:
            raise ValidationError({"detail": "Indica fecha desde y fecha hasta."})
        try:
            start = timezone.datetime.fromisoformat(str(date_from)).date()
            end = timezone.datetime.fromisoformat(str(date_to)).date()
        except ValueError as exc:
            raise ValidationError({"detail": "Usa fechas válidas en formato YYYY-MM-DD."}) from exc
        period = "custom"
    elif period == "month":
        start = today.replace(day=1)
        end = today
    elif period in PERIOD_DAYS:
        start = today - timedelta(days=PERIOD_DAYS[period])
        end = today
    else:
        raise ValidationError({"detail": "El período solicitado no es válido."})

    if start > end:
        raise ValidationError({"detail": "La fecha desde no puede ser posterior a la fecha hasta."})
    if end > today:
        raise ValidationError({"detail": "La fecha hasta no puede estar en el futuro."})
    if (end - start).days > 366:
        raise ValidationError({"detail": "El rango no puede superar 366 días."})
    return {"key": period, "date_from": start, "date_to": end}


def build_superadmin_dashboard(params):
    period = resolve_metric_period(params)
    start = period["date_from"]
    end = period["date_to"]
    role_counts = {
        row["role__nombre"]: row["total"]
        for row in User.objects.values("role__nombre").annotate(total=Count("id"))
    }
    clinic_counts = Clinic.objects.aggregate(
        total=Count("id"),
        active=Count("id", filter=Q(activo=True)),
        inactive=Count("id", filter=Q(activo=False)),
    )
    subscription_counts = {
        row["status"]: row["total"]
        for row in ClinicSubscription.objects.values("status").annotate(total=Count("id"))
    }
    plans_used = {
        row["plan__code"]: {"name": row["plan__name"], "clinics": row["total"]}
        for row in ClinicSubscription.objects.values("plan__code", "plan__name").annotate(total=Count("id"))
    }
    total_users = User.objects.count()
    active_users = User.objects.filter(is_active=True).count()
    active_hospital_statuses = getattr(Hospitalization, "ACTIVE_STATUSES", [])
    usage = {
        "appointments": Appointment.objects.filter(scheduled_date__range=(start, end)).count(),
        "consultations": ClinicalConsultation.objects.filter(creado_en__date__range=(start, end)).count(),
        "invoices": Invoice.objects.filter(issue_date__range=(start, end)).count(),
        "active_hospitalizations": Hospitalization.objects.filter(status__in=active_hospital_statuses).count(),
    }
    alerts = build_superadmin_alerts(limit=25)
    return {
        # Compatibility keys used by the current web and mobile dashboards.
        "total_clinics": clinic_counts["total"],
        "active_clinics": clinic_counts["active"],
        "inactive_clinics": clinic_counts["inactive"],
        "total_users": total_users,
        "active_users": active_users,
        "inactive_users": total_users - active_users,
        "total_admins": role_counts.get("admin", 0),
        "total_medicos": role_counts.get("medico", 0),
        "total_enfermeras": role_counts.get("enfermera", 0),
        "total_pacientes": role_counts.get("paciente", 0),
        "period": {"key": period["key"], "date_from": start, "date_to": end},
        "clinics": clinic_counts,
        "users": {
            "total": total_users,
            "active": active_users,
            "admins": role_counts.get("admin", 0),
            "doctors": role_counts.get("medico", 0),
            "nurses": role_counts.get("enfermera", 0),
            "patients": role_counts.get("paciente", 0),
        },
        "usage": usage,
        "subscriptions": {
            "total": sum(subscription_counts.values()),
            "by_status": subscription_counts,
            "active": subscription_counts.get("active", 0),
            "trial": subscription_counts.get("trial", 0),
            "suspended": subscription_counts.get("suspended", 0),
            "expired": subscription_counts.get("expired", 0),
            "plans_used": plans_used,
        },
        "critical_alerts": sum(1 for alert in alerts if alert["severity"] == "critical"),
        "alerts_count": len(alerts),
    }


def build_superadmin_alerts(limit=100):
    today = timezone.localdate()
    alerts = []
    clinics = _clinics_with_usage().order_by("nombre")
    for clinic in clinics:
        subscription = getattr(clinic, "subscription", None)
        if not clinic.activo:
            alerts.append(_alert("clinic_suspended", "warning", clinic, "La clínica está suspendida."))
        if not clinic.active_admins_count:
            alerts.append(_alert("missing_admin", "critical", clinic, "La clínica no tiene un administrador activo."))
        if not subscription:
            alerts.append(_alert("missing_subscription", "critical", clinic, "La clínica no tiene una suscripción asignada."))
        else:
            if subscription.status in {ClinicSubscription.Status.EXPIRED, ClinicSubscription.Status.CANCELLED}:
                alerts.append(_alert("subscription_inactive", "critical", clinic, "La suscripción no está activa."))
            elif subscription.end_date:
                remaining = (subscription.end_date - today).days
                if remaining < 0:
                    alerts.append(_alert("subscription_expired", "critical", clinic, "La suscripción está vencida."))
                elif remaining <= 30:
                    severity = "critical" if remaining <= 1 else "warning"
                    alerts.append(_alert("subscription_expiring", severity, clinic, f"La suscripción vence en {remaining} días."))
            usage = _usage_payload(clinic)
            for resource in ("users", "doctors", "patients"):
                current = usage[f"{resource}_count"]
                maximum = usage[f"max_{resource}"]
                if maximum and current >= maximum:
                    alerts.append(_alert(f"{resource}_limit", "warning", clinic, f"Uso de {resource}: {current} de {maximum}."))
    severity_order = {"critical": 0, "warning": 1, "info": 2}
    alerts.sort(key=lambda item: (severity_order[item["severity"]], item["clinic_name"].casefold(), item["code"]))
    return alerts[:limit]


def _alert(code, severity, clinic, message):
    return {
        "id": f"{code}:{clinic.id}",
        "code": code,
        "severity": severity,
        "clinic_id": clinic.id,
        "clinic_name": clinic.nombre,
        "message": message,
    }


def build_system_status():
    database_status = "operational"
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except Exception:
        database_status = "unavailable"

    backup = {
        "status": os.environ.get("MEDICORE_LAST_BACKUP_STATUS", "not_monitored"),
        "last_confirmed_at": os.environ.get("MEDICORE_LAST_BACKUP_AT", "") or None,
        "verified_at": None,
    }
    status_path = Path(settings.MEDICORE_BACKUP_STATUS_FILE)
    try:
        status_payload = json.loads(status_path.read_text(encoding="utf-8"))
        backup.update({
            "status": status_payload.get("status", backup["status"]),
            "last_confirmed_at": status_payload.get("created_at", backup["last_confirmed_at"]),
            "verified_at": status_payload.get("verified_at"),
        })
    except (OSError, ValueError, TypeError):
        pass
    return {
        "api": "operational",
        "database": database_status,
        "task_queue": os.environ.get("MEDICORE_TASK_QUEUE_STATUS", "not_configured"),
        "scheduler": os.environ.get("MEDICORE_SCHEDULER_STATUS", "not_configured"),
        "backup": backup,
        "version": os.environ.get("MEDICORE_RELEASE", "unknown"),
        "environment": os.environ.get("DJANGO_ENV", "unknown"),
        "checked_at": timezone.now(),
    }


def build_global_usage():
    return [
        {"clinic_id": clinic.id, "clinic_name": clinic.nombre, **_usage_payload(clinic)}
        for clinic in _clinics_with_usage().order_by("nombre")
    ]


def _clinics_with_usage():
    month_start = timezone.localdate().replace(day=1)
    active_admins = User.objects.filter(
        clinica=OuterRef("pk"), role__nombre="admin", is_active=True
    ).values("clinica").annotate(total=Count("id")).values("total")
    active_users = User.objects.filter(
        clinica=OuterRef("pk"), is_active=True
    ).values("clinica").annotate(total=Count("id")).values("total")
    active_doctors = DoctorProfile.objects.filter(
        clinic=OuterRef("pk"), activo=True
    ).values("clinic").annotate(total=Count("id")).values("total")
    active_patients = Patient.objects.filter(
        clinic=OuterRef("pk"), activo=True
    ).values("clinic").annotate(total=Count("id")).values("total")
    monthly_appointments = Appointment.objects.filter(
        clinic=OuterRef("pk"), scheduled_date__gte=month_start
    ).values("clinic").annotate(total=Count("id")).values("total")
    return Clinic.objects.select_related("subscription__plan").annotate(
        active_admins_count=Coalesce(Subquery(active_admins, output_field=IntegerField()), Value(0)),
        users_count=Coalesce(Subquery(active_users, output_field=IntegerField()), Value(0)),
        doctors_count=Coalesce(Subquery(active_doctors, output_field=IntegerField()), Value(0)),
        patients_count=Coalesce(Subquery(active_patients, output_field=IntegerField()), Value(0)),
        appointments_this_month=Coalesce(Subquery(monthly_appointments, output_field=IntegerField()), Value(0)),
    )


def _usage_payload(clinic):
    subscription = getattr(clinic, "subscription", None)
    plan = subscription.plan if subscription else None
    return {
        "plan": plan.name if plan else None,
        "plan_code": plan.code if plan else None,
        "status": subscription.status if subscription else "unassigned",
        "users_count": clinic.users_count,
        "doctors_count": clinic.doctors_count,
        "patients_count": clinic.patients_count,
        "appointments_this_month": clinic.appointments_this_month,
        "storage_used_mb": 0,
        "max_users": plan.max_users if plan else 0,
        "max_doctors": plan.max_doctors if plan else 0,
        "max_patients": plan.max_patients if plan else 0,
        "max_appointments_per_month": plan.max_appointments_per_month if plan else 0,
        "max_storage_mb": plan.max_storage_mb if plan else 0,
    }


def active_session_count():
    return UserSession.objects.filter(active=True, expires_at__gt=timezone.now()).count()
