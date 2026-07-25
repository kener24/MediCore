from io import BytesIO

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.http import HttpResponse
from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.permissions import get_role_name
from apps.audit.models import AuditLog
from apps.audit.services import log_audit_event
from apps.medical_records.models import ClinicalConsultation
from apps.prescriptions.models import Diagnosis, MedicalOrder, Prescription, PrescriptionItem
from apps.prescriptions.serializers import (
    DiagnosisCreateSerializer,
    DiagnosisDetailSerializer,
    DiagnosisListSerializer,
    DiagnosisUpdateSerializer,
    MedicalOrderCreateSerializer,
    MedicalOrderCancelSerializer,
    MedicalOrderCompleteSerializer,
    MedicalOrderDetailSerializer,
    MedicalOrderListSerializer,
    MedicalOrderUpdateSerializer,
    PrescriptionCreateSerializer,
    PrescriptionDetailSerializer,
    PrescriptionItemSerializer,
    PrescriptionListSerializer,
    PrescriptionIssueSerializer,
    PrescriptionStatsSerializer,
    PrescriptionUpdateSerializer,
    PrescriptionVoidSerializer,
)
from apps.notifications.models import Notification
from apps.notifications.services import create_notification


VIEW_ROLES = ["admin", "medico", "enfermera", "paciente"]


def render_prescription_pdf(prescription):
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table as PdfTable

    output = BytesIO()
    doc = SimpleDocTemplate(output, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=32, bottomMargin=32)
    styles = getSampleStyleSheet()
    doctor = prescription.doctor
    story = [
        Paragraph(str(getattr(prescription.clinic, "nombre", "MediCore")), styles["Title"]),
        Paragraph("RECETA MEDICA", styles["Heading2"]),
        Spacer(1, 8),
        Paragraph(f"Receta: {prescription.prescription_number}", styles["BodyText"]),
        Paragraph(f"Estado: {prescription.get_status_display()}", styles["BodyText"]),
        Paragraph(f"Paciente: {prescription.patient.nombre_completo}", styles["BodyText"]),
        Paragraph(f"Medico: {doctor.user.nombre_completo}", styles["BodyText"]),
        Paragraph(f"Colegiacion: {getattr(doctor, 'numero_colegiacion', '') or 'No indicada'}", styles["BodyText"]),
        Paragraph(f"Fecha: {prescription.issue_date:%d/%m/%Y}", styles["BodyText"]),
        Spacer(1, 14),
    ]
    rows = [["Medicamento", "Dosis", "Via", "Frecuencia", "Duracion", "Cantidad"]]
    for item in prescription.items.filter(activo=True):
        rows.append([item.medication_name, item.dosage, item.get_route_display(), item.frequency, item.duration or "-", item.quantity or "-"])
    story.append(PdfTable(rows, repeatRows=1, colWidths=[130, 70, 65, 90, 70, 55]))
    story.append(Spacer(1, 12))
    story.append(Paragraph(f"Indicaciones: {prescription.general_instructions or 'Sin indicaciones adicionales.'}", styles["BodyText"]))
    story.append(Spacer(1, 22))
    story.append(Paragraph("Documento generado por MediCore. Valide identidad, estado y numero de receta.", styles["BodyText"]))
    doc.build(story)
    return output.getvalue()


def scoped_queryset(request, queryset):
    role = get_role_name(request.user)
    if role == "superadmin" or request.user.is_superuser:
        return queryset.none()
    if role in ["admin", "enfermera"] and request.user.clinica_id:
        return queryset.filter(clinic_id=request.user.clinica_id)
    if role == "medico":
        return queryset.filter(doctor__user=request.user)
    if role == "paciente":
        return queryset.filter(patient__user=request.user)
    return queryset.none()


class DiagnosisViewSet(viewsets.ModelViewSet):
    queryset = Diagnosis.objects.select_related("clinic", "patient", "doctor__user", "consultation")
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "list":
            return DiagnosisListSerializer
        if self.action == "create":
            return DiagnosisCreateSerializer
        if self.action in ["update", "partial_update"]:
            return DiagnosisUpdateSerializer
        return DiagnosisDetailSerializer

    def get_queryset(self):
        queryset = scoped_queryset(self.request, super().get_queryset())
        params = self.request.query_params
        if params.get("patient"):
            queryset = queryset.filter(patient_id=params["patient"])
        if params.get("consultation"):
            queryset = queryset.filter(consultation_id=params["consultation"])
        if params.get("doctor"):
            queryset = queryset.filter(doctor_id=params["doctor"])
        if params.get("is_primary") is not None:
            queryset = queryset.filter(is_primary=params["is_primary"].lower() in ["1", "true", "yes", "si"])
        if params.get("diagnosis_type"):
            queryset = queryset.filter(diagnosis_type=params["diagnosis_type"])
        if params.get("type"):
            queryset = queryset.filter(diagnosis_type=params["type"])
        if params.get("search"):
            search = params["search"]
            queryset = queryset.filter(Q(code__icontains=search) | Q(name__icontains=search) | Q(description__icontains=search))
        if get_role_name(self.request.user) == "paciente":
            queryset = queryset.filter(consultation__status=ClinicalConsultation.Status.FINALIZADA, activo=True)
        return queryset

    def list(self, request, *args, **kwargs):
        if get_role_name(request.user) not in VIEW_ROLES:
            return Response({"detail": "No tienes permiso para ver diagnosticos."}, status=status.HTTP_403_FORBIDDEN)
        return super().list(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        diagnosis = self.get_object()
        if get_role_name(request.user) != "medico" or diagnosis.doctor.user_id != request.user.id:
            return Response({"detail": "No tienes permiso para eliminar este diagnóstico."}, status=status.HTTP_403_FORBIDDEN)
        diagnosis.activo = False
        diagnosis.save(update_fields=["activo"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["get"], url_path="my-diagnoses")
    def my_diagnoses(self, request):
        if get_role_name(request.user) != "paciente":
            return Response({"detail": "Solo disponible para pacientes."}, status=status.HTTP_403_FORBIDDEN)
        return Response(DiagnosisListSerializer(self.get_queryset(), many=True).data)


class PrescriptionViewSet(viewsets.ModelViewSet):
    queryset = Prescription.objects.select_related("clinic", "patient", "doctor__user", "consultation").prefetch_related("items")
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "list":
            return PrescriptionListSerializer
        if self.action == "create":
            return PrescriptionCreateSerializer
        if self.action in ["update", "partial_update"]:
            return PrescriptionUpdateSerializer
        return PrescriptionDetailSerializer

    def get_queryset(self):
        queryset = scoped_queryset(self.request, super().get_queryset())
        params = self.request.query_params
        if params.get("patient"):
            queryset = queryset.filter(patient_id=params["patient"])
        if params.get("consultation"):
            queryset = queryset.filter(consultation_id=params["consultation"])
        if params.get("doctor"):
            queryset = queryset.filter(doctor_id=params["doctor"])
        if params.get("status"):
            queryset = queryset.filter(status=params["status"])
        if params.get("date_from"):
            queryset = queryset.filter(issue_date__gte=params["date_from"])
        if params.get("date_to"):
            queryset = queryset.filter(issue_date__lte=params["date_to"])
        if params.get("search"):
            search = params["search"]
            queryset = queryset.filter(Q(prescription_number__icontains=search) | Q(patient__nombre_completo__icontains=search) | Q(items__medication_name__icontains=search)).distinct()
        if get_role_name(self.request.user) == "paciente":
            queryset = queryset.filter(status=Prescription.Status.EMITIDA, activo=True)
        return queryset

    def create(self, request, *args, **kwargs):
        if get_role_name(request.user) != "medico":
            return Response({"detail": "Solo medicos pueden crear recetas."}, status=status.HTTP_403_FORBIDDEN)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        prescription = serializer.save()
        log_audit_event(
            request=request, clinic=prescription.clinic, action=AuditLog.Action.CREATE,
            module=AuditLog.Module.PRESCRIPTIONS, model_name="Prescription", object_id=prescription.id,
            object_repr=prescription.prescription_number, description="Receta creada.",
            new_values={"consultation": prescription.consultation_id, "items_count": prescription.items.filter(activo=True).count(), "status": prescription.status},
        )
        return Response(PrescriptionDetailSerializer(prescription).data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        return Response({"detail": "Las recetas no se eliminan. Usa la accion de anulacion e indica un motivo."}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    @action(detail=True, methods=["patch"])
    def issue(self, request, pk=None):
        payload = PrescriptionIssueSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        prescription = self.get_object()
        if get_role_name(request.user) != "medico" or prescription.doctor.user_id != request.user.id:
            return Response({"detail": "No tienes permiso para emitir esta receta."}, status=status.HTTP_403_FORBIDDEN)
        with transaction.atomic():
            prescription = Prescription.objects.select_for_update().select_related("clinic", "patient__user", "doctor__user", "consultation").get(pk=prescription.pk)
            if prescription.status == Prescription.Status.EMITIDA:
                return Response({"detail": "La receta ya fue emitida."}, status=status.HTTP_409_CONFLICT)
            try:
                prescription.issue(
                    user=request.user,
                    confirm_allergies=payload.validated_data["confirm_allergies"],
                    allergy_override_reason=payload.validated_data.get("allergy_override_reason", ""),
                )
            except DjangoValidationError as exc:
                detail = exc.messages[0]
                if "alergia" in detail.lower():
                    log_audit_event(request=request, clinic=prescription.clinic, action=AuditLog.Action.VIEW, module=AuditLog.Module.PRESCRIPTIONS, model_name="Prescription", object_id=prescription.id, object_repr=prescription.prescription_number, description="Alerta de alergia presentada antes de emitir.", status=AuditLog.Status.WARNING, severity=AuditLog.Severity.WARNING)
                return Response({"detail": detail}, status=status.HTTP_409_CONFLICT if "alergia" in detail.lower() else status.HTTP_400_BAD_REQUEST)
        if prescription.patient.user:
            create_notification(prescription.patient.user, "Receta emitida", "Tienes una nueva receta disponible.", clinic=prescription.clinic, notification_type=Notification.Type.INFO, module=Notification.Module.PRESCRIPTIONS, priority=Notification.Priority.NORMAL, related_model="Prescription", related_object_id=prescription.id, action_url="/patient/prescriptions")
        log_audit_event(request=request, clinic=prescription.clinic, action=AuditLog.Action.ISSUE, module=AuditLog.Module.PRESCRIPTIONS, model_name="Prescription", object_id=prescription.id, object_repr=prescription.prescription_number, description="Receta emitida.", new_values={"status": prescription.status, "allergy_override_confirmed": bool(prescription.allergy_reviewed_at)})
        return Response(PrescriptionDetailSerializer(prescription).data)

    @action(detail=True, methods=["patch"])
    def void(self, request, pk=None):
        prescription = self.get_object()
        if get_role_name(request.user) != "medico" or prescription.doctor.user_id != request.user.id:
            return Response({"detail": "No tienes permiso para anular esta receta."}, status=status.HTTP_403_FORBIDDEN)
        payload = PrescriptionVoidSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        try:
            prescription.void(user=request.user, reason=payload.validated_data["reason"])
        except DjangoValidationError as exc:
            return Response({"detail": exc.messages[0]}, status=status.HTTP_409_CONFLICT)
        log_audit_event(request=request, clinic=prescription.clinic, action=AuditLog.Action.CANCEL, module=AuditLog.Module.PRESCRIPTIONS, model_name="Prescription", object_id=prescription.id, object_repr=prescription.prescription_number, description="Receta anulada.", new_values={"status": prescription.status, "reason": prescription.void_reason})
        return Response(PrescriptionDetailSerializer(prescription).data)

    @action(detail=True, methods=["get"])
    def pdf(self, request, pk=None):
        prescription = self.get_object()
        if prescription.status != Prescription.Status.EMITIDA:
            return Response({"detail": "Solo las recetas emitidas tienen PDF disponible."}, status=status.HTTP_409_CONFLICT)
        response = HttpResponse(render_prescription_pdf(prescription), content_type="application/pdf")
        response["Content-Disposition"] = f'inline; filename="receta-{prescription.prescription_number}.pdf"'
        log_audit_event(request=request, clinic=prescription.clinic, action=AuditLog.Action.VIEW, module=AuditLog.Module.PRESCRIPTIONS, model_name="Prescription", object_id=prescription.id, object_repr=prescription.prescription_number, description="PDF de receta consultado.")
        return response

    @action(detail=True, methods=["get", "post"], url_path="items")
    def items(self, request, pk=None):
        prescription = self.get_object()
        if request.method == "GET":
            return Response(PrescriptionItemSerializer(prescription.items.filter(activo=True), many=True).data)
        if get_role_name(request.user) != "medico" or prescription.doctor.user_id != request.user.id:
            return Response({"detail": "No tienes permiso para agregar medicamentos."}, status=status.HTTP_403_FORBIDDEN)
        serializer = PrescriptionItemSerializer(data=request.data, context={"prescription": prescription})
        serializer.is_valid(raise_exception=True)
        serializer.save(prescription=prescription)
        if serializer.data.get("allergy_warnings"):
            log_audit_event(request=request, clinic=prescription.clinic, action=AuditLog.Action.VIEW, module=AuditLog.Module.PRESCRIPTIONS, model_name="Prescription", object_id=prescription.id, object_repr=prescription.prescription_number, description="Alerta de alergia presentada al agregar medicamento.", status=AuditLog.Status.WARNING, severity=AuditLog.Severity.WARNING)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["patch", "delete"], url_path=r"items/(?P<item_id>[^/.]+)")
    def item_detail(self, request, pk=None, item_id=None):
        prescription = self.get_object()
        item = prescription.items.filter(id=item_id).first()
        if not item:
            return Response({"detail": "Medicamento no encontrado."}, status=status.HTTP_404_NOT_FOUND)
        if get_role_name(request.user) != "medico" or prescription.doctor.user_id != request.user.id:
            return Response({"detail": "No tienes permiso para modificar medicamentos."}, status=status.HTTP_403_FORBIDDEN)
        if request.method == "DELETE":
            if prescription.status != Prescription.Status.BORRADOR:
                return Response({"detail": "No puedes eliminar medicamentos de una receta emitida o anulada."}, status=status.HTTP_409_CONFLICT)
            item.activo = False
            item.save(update_fields=["activo"])
            return Response(status=status.HTTP_204_NO_CONTENT)
        serializer = PrescriptionItemSerializer(item, data=request.data, partial=True, context={"prescription": prescription})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="my-prescriptions")
    def my_prescriptions(self, request):
        if get_role_name(request.user) != "paciente":
            return Response({"detail": "Solo disponible para pacientes."}, status=status.HTTP_403_FORBIDDEN)
        return Response(PrescriptionListSerializer(self.get_queryset(), many=True).data)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        if get_role_name(request.user) == "paciente":
            return Response({"detail": "No tienes permiso para ver estadisticas."}, status=status.HTTP_403_FORBIDDEN)
        prescriptions = scoped_queryset(request, Prescription.objects.all())
        orders = scoped_queryset(request, MedicalOrder.objects.all())
        data = {
            "total_prescriptions": prescriptions.count(),
            "draft_prescriptions": prescriptions.filter(status=Prescription.Status.BORRADOR).count(),
            "issued_prescriptions": prescriptions.filter(status=Prescription.Status.EMITIDA).count(),
            "voided_prescriptions": prescriptions.filter(status=Prescription.Status.ANULADA).count(),
            "total_orders": orders.count(),
            "pending_orders": orders.filter(status=MedicalOrder.Status.PENDIENTE).count(),
            "completed_orders": orders.filter(status=MedicalOrder.Status.COMPLETADA).count(),
            "cancelled_orders": orders.filter(status=MedicalOrder.Status.CANCELADA).count(),
        }
        return Response(PrescriptionStatsSerializer(data).data)


class MedicalOrderViewSet(viewsets.ModelViewSet):
    queryset = MedicalOrder.objects.select_related("clinic", "patient", "doctor__user", "consultation")
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "list":
            return MedicalOrderListSerializer
        if self.action == "create":
            return MedicalOrderCreateSerializer
        if self.action in ["update", "partial_update"]:
            return MedicalOrderUpdateSerializer
        return MedicalOrderDetailSerializer

    def get_queryset(self):
        queryset = scoped_queryset(self.request, super().get_queryset())
        params = self.request.query_params
        for param, field in [("patient", "patient_id"), ("consultation", "consultation_id"), ("doctor", "doctor_id"), ("order_type", "order_type"), ("type", "order_type"), ("status", "status"), ("priority", "priority")]:
            if params.get(param):
                queryset = queryset.filter(**{field: params[param]})
        if params.get("date_from"):
            queryset = queryset.filter(creado_en__date__gte=params["date_from"])
        if params.get("date_to"):
            queryset = queryset.filter(creado_en__date__lte=params["date_to"])
        if params.get("search"):
            search = params["search"]
            queryset = queryset.filter(Q(order_number__icontains=search) | Q(title__icontains=search) | Q(description__icontains=search))
        return queryset

    def create(self, request, *args, **kwargs):
        if get_role_name(request.user) != "medico":
            return Response({"detail": "Solo medicos pueden crear ordenes medicas."}, status=status.HTTP_403_FORBIDDEN)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        log_audit_event(request=request, clinic=order.clinic, action=AuditLog.Action.CREATE, module=AuditLog.Module.MEDICAL_ORDERS, model_name="MedicalOrder", object_id=order.id, object_repr=order.order_number, description="Orden medica creada y emitida.", new_values={"consultation": order.consultation_id, "order_type": order.order_type, "priority": order.priority, "status": order.status})
        if order.patient.user:
            create_notification(order.patient.user, "Orden medica creada", "Tienes una nueva orden medica disponible.", clinic=order.clinic, notification_type=Notification.Type.INFO, module=Notification.Module.PRESCRIPTIONS, priority=Notification.Priority.NORMAL, related_model="MedicalOrder", related_object_id=order.id, action_url="/patient/medical-orders")
        return Response(MedicalOrderDetailSerializer(order).data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        return Response({"detail": "Las ordenes medicas no se eliminan. Usa cancelar e indica un motivo."}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    @action(detail=True, methods=["patch"])
    def start(self, request, pk=None):
        order = self.get_object()
        if get_role_name(request.user) not in ["medico", "enfermera", "admin"]:
            return Response({"detail": "No tienes permiso para iniciar esta orden medica."}, status=status.HTTP_403_FORBIDDEN)
        try:
            order.start(request.user)
        except DjangoValidationError as exc:
            return Response({"detail": exc.messages[0]}, status=status.HTTP_409_CONFLICT)
        log_audit_event(request=request, clinic=order.clinic, action=AuditLog.Action.UPDATE, module=AuditLog.Module.MEDICAL_ORDERS, model_name="MedicalOrder", object_id=order.id, object_repr=order.order_number, description="Ejecucion de orden medica iniciada.", new_values={"status": order.status, "responsible_user": request.user.id})
        return Response(MedicalOrderDetailSerializer(order).data)

    @action(detail=True, methods=["patch"])
    def complete(self, request, pk=None):
        order = self.get_object()
        if get_role_name(request.user) not in ["medico", "enfermera", "admin"]:
            return Response({"detail": "No tienes permiso para completar esta orden médica."}, status=status.HTTP_403_FORBIDDEN)
        payload = MedicalOrderCompleteSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        try:
            order.complete(request.user, payload.validated_data["result_summary"])
        except DjangoValidationError as exc:
            return Response({"detail": exc.messages[0]}, status=status.HTTP_409_CONFLICT)
        if order.patient.user:
            create_notification(order.patient.user, "Orden medica completada", f"La orden {order.order_number} fue completada.", clinic=order.clinic, notification_type=Notification.Type.SUCCESS, module=Notification.Module.PRESCRIPTIONS, priority=Notification.Priority.NORMAL, related_model="MedicalOrder", related_object_id=order.id, action_url="/patient/medical-orders")
        log_audit_event(request=request, clinic=order.clinic, action=AuditLog.Action.COMPLETE, module=AuditLog.Module.MEDICAL_ORDERS, model_name="MedicalOrder", object_id=order.id, object_repr=order.order_number, description="Orden medica completada.", new_values={"status": order.status})
        return Response(MedicalOrderDetailSerializer(order).data)

    @action(detail=True, methods=["patch"])
    def review(self, request, pk=None):
        order = self.get_object()
        if get_role_name(request.user) != "medico" or order.doctor.user_id != request.user.id:
            return Response({"detail": "No tienes permiso para revisar esta orden medica."}, status=status.HTTP_403_FORBIDDEN)
        from apps.prescriptions.serializers import MedicalOrderReviewSerializer

        payload = MedicalOrderReviewSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        try:
            order.review(request.user, payload.validated_data.get("notes", ""))
        except DjangoValidationError as exc:
            return Response({"detail": exc.messages[0]}, status=status.HTTP_409_CONFLICT)
        log_audit_event(request=request, clinic=order.clinic, action=AuditLog.Action.APPROVE, module=AuditLog.Module.MEDICAL_ORDERS, model_name="MedicalOrder", object_id=order.id, object_repr=order.order_number, description="Resultado de orden medica revisado.", new_values={"status": order.status})
        return Response(MedicalOrderDetailSerializer(order).data)

    @action(detail=True, methods=["patch"])
    def cancel(self, request, pk=None):
        order = self.get_object()
        if get_role_name(request.user) != "medico" or order.doctor.user_id != request.user.id:
            return Response({"detail": "No tienes permiso para cancelar esta orden médica."}, status=status.HTTP_403_FORBIDDEN)
        payload = MedicalOrderCancelSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        try:
            order.cancel(request.user, payload.validated_data["reason"])
        except DjangoValidationError as exc:
            return Response({"detail": exc.messages[0]}, status=status.HTTP_409_CONFLICT)
        log_audit_event(request=request, clinic=order.clinic, action=AuditLog.Action.CANCEL, module=AuditLog.Module.MEDICAL_ORDERS, model_name="MedicalOrder", object_id=order.id, object_repr=order.order_number, description="Orden medica cancelada.", new_values={"status": order.status})
        return Response(MedicalOrderDetailSerializer(order).data)

    @action(detail=False, methods=["get"], url_path="my-orders")
    def my_orders(self, request):
        if get_role_name(request.user) != "paciente":
            return Response({"detail": "Solo disponible para pacientes."}, status=status.HTTP_403_FORBIDDEN)
        return Response(MedicalOrderListSerializer(self.get_queryset(), many=True).data)
