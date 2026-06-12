from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.permissions import get_role_name
from apps.appointments.models import Appointment
from apps.doctors.models import DoctorProfile
from apps.medical_records.models import ClinicalConsultation, ClinicalSupplyUsage, MedicalRecord, VitalSigns
from apps.medical_records.serializers import (
    ClinicalConsultationCreateSerializer,
    ClinicalConsultationDetailSerializer,
    ClinicalConsultationFinalizeSerializer,
    ClinicalConsultationListSerializer,
    ClinicalConsultationUpdateSerializer,
    ClinicalSupplyUsageCancelSerializer,
    ClinicalSupplyUsageCreateSerializer,
    ClinicalSupplyUsageSerializer,
    MedicalRecordCreateSerializer,
    MedicalRecordDetailSerializer,
    MedicalRecordListSerializer,
    MedicalRecordMeSerializer,
    MedicalRecordStatsSerializer,
    MedicalRecordUpdateSerializer,
    VitalSignsSerializer,
)
from apps.patients.models import Patient
from apps.patients.serializers import PatientListSerializer
from apps.audit.models import AuditLog
from apps.audit.services import log_audit_event


RECORD_VIEW_ROLES = ["superadmin", "admin", "medico", "enfermera"]
RECORD_WRITE_ROLES = ["superadmin", "admin", "medico", "enfermera"]
VITAL_WRITE_ROLES = ["medico", "enfermera"]
CONSUMPTION_VIEW_ROLES = ["superadmin", "admin", "medico", "enfermera", "recepcionista"]
CONSUMPTION_WRITE_ROLES = ["superadmin", "admin", "medico", "enfermera"]


class MedicalRecordViewSet(viewsets.ModelViewSet):
    queryset = MedicalRecord.objects.select_related("clinic", "patient", "patient__user")
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "list":
            return MedicalRecordListSerializer
        if self.action == "create":
            return MedicalRecordCreateSerializer
        if self.action in ["update", "partial_update"]:
            return MedicalRecordUpdateSerializer
        return MedicalRecordDetailSerializer

    def get_queryset(self):
        user = self.request.user
        role = get_role_name(user)
        queryset = super().get_queryset()
        if role == "superadmin" or user.is_superuser:
            clinic = self.request.query_params.get("clinic")
            if clinic:
                queryset = queryset.filter(clinic_id=clinic)
        elif role in ["admin", "medico", "enfermera"] and user.clinica_id:
            queryset = queryset.filter(clinic_id=user.clinica_id)
        elif role == "paciente":
            queryset = queryset.filter(patient__user=user)
        else:
            queryset = queryset.none()

        params = self.request.query_params
        if params.get("patient"):
            queryset = queryset.filter(patient_id=params["patient"])
        if params.get("is_active") is not None:
            queryset = queryset.filter(activo=params["is_active"].lower() in ["1", "true", "yes", "si"])
        if params.get("search"):
            search = params["search"]
            queryset = queryset.filter(
                Q(record_number__icontains=search)
                | Q(patient__nombre_completo__icontains=search)
                | Q(patient__identidad__icontains=search)
                | Q(patient__codigo_paciente__icontains=search)
            )
        return queryset

    def list(self, request, *args, **kwargs):
        if get_role_name(request.user) not in RECORD_VIEW_ROLES:
            return Response({"detail": "No tienes permiso para listar expedientes."}, status=status.HTTP_403_FORBIDDEN)
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        if get_role_name(request.user) == "recepcionista":
            return Response({"detail": "No tienes permiso para ver expediente clinico completo."}, status=status.HTTP_403_FORBIDDEN)
        return super().retrieve(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        if get_role_name(request.user) not in RECORD_WRITE_ROLES:
            return Response({"detail": "No tienes permiso para crear expedientes."}, status=status.HTTP_403_FORBIDDEN)
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        if get_role_name(request.user) not in RECORD_WRITE_ROLES:
            return Response({"detail": "No tienes permiso para actualizar expedientes."}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if get_role_name(request.user) not in ["superadmin", "admin"]:
            return Response({"detail": "No tienes permiso para desactivar expedientes."}, status=status.HTTP_403_FORBIDDEN)
        record = self.get_object()
        record.activo = False
        record.save(update_fields=["activo"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["get"])
    def me(self, request):
        if get_role_name(request.user) != "paciente":
            return Response({"detail": "Solo disponible para pacientes."}, status=status.HTTP_403_FORBIDDEN)
        record = self.get_queryset().first()
        if not record:
            return Response({"detail": "No tienes expediente medico vinculado."}, status=status.HTTP_404_NOT_FOUND)
        return Response(MedicalRecordMeSerializer(record).data)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        role = get_role_name(request.user)
        if role == "paciente" or role == "recepcionista":
            return Response({"detail": "No tienes permiso para ver estadisticas clinicas."}, status=status.HTTP_403_FORBIDDEN)
        records = self.get_queryset()
        consultations = ClinicalConsultation.objects.filter(clinic_id__in=records.values("clinic_id"))
        if role == "medico":
            consultations = consultations.filter(doctor__user=request.user)
        today = timezone.localdate()
        data = {
            "total_records": records.count(),
            "active_records": records.filter(activo=True).count(),
            "total_consultations": consultations.count(),
            "consultations_today": consultations.filter(consultation_date=today).count(),
            "draft_consultations": consultations.filter(status=ClinicalConsultation.Status.BORRADOR).count(),
            "finalized_consultations": consultations.filter(status=ClinicalConsultation.Status.FINALIZADA).count(),
        }
        return Response(MedicalRecordStatsSerializer(data).data)


class ClinicalConsultationViewSet(viewsets.ModelViewSet):
    queryset = ClinicalConsultation.objects.select_related(
        "clinic",
        "medical_record",
        "patient",
        "doctor__user",
        "doctor__specialty",
        "appointment",
        "created_by",
        "finalized_by",
    ).prefetch_related("vital_signs")
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "list":
            return ClinicalConsultationListSerializer
        if self.action == "create":
            return ClinicalConsultationCreateSerializer
        if self.action in ["update", "partial_update"]:
            return ClinicalConsultationUpdateSerializer
        return ClinicalConsultationDetailSerializer

    def get_queryset(self):
        user = self.request.user
        role = get_role_name(user)
        queryset = super().get_queryset()
        if role == "superadmin" or user.is_superuser:
            clinic = self.request.query_params.get("clinic")
            if clinic:
                queryset = queryset.filter(clinic_id=clinic)
        elif role in ["admin", "enfermera"] and user.clinica_id:
            queryset = queryset.filter(clinic_id=user.clinica_id)
        elif role == "medico":
            queryset = queryset.filter(doctor__user=user)
        elif role == "paciente":
            queryset = queryset.filter(patient__user=user, status=ClinicalConsultation.Status.FINALIZADA)
        else:
            queryset = queryset.none()
        params = self.request.query_params
        if params.get("patient"):
            queryset = queryset.filter(patient_id=params["patient"])
        if params.get("doctor"):
            queryset = queryset.filter(doctor_id=params["doctor"])
        if params.get("appointment"):
            queryset = queryset.filter(appointment_id=params["appointment"])
        if params.get("date"):
            queryset = queryset.filter(consultation_date=params["date"])
        if params.get("date_from"):
            queryset = queryset.filter(consultation_date__gte=params["date_from"])
        if params.get("date_to"):
            queryset = queryset.filter(consultation_date__lte=params["date_to"])
        if params.get("status"):
            queryset = queryset.filter(status=params["status"])
        if params.get("search"):
            search = params["search"]
            queryset = queryset.filter(
                Q(patient__nombre_completo__icontains=search)
                | Q(doctor__user__nombre_completo__icontains=search)
                | Q(chief_complaint__icontains=search)
                | Q(preliminary_diagnosis__icontains=search)
            )
        return queryset

    def list(self, request, *args, **kwargs):
        if get_role_name(request.user) == "recepcionista":
            return Response({"detail": "No tienes permiso para listar consultas clinicas."}, status=status.HTTP_403_FORBIDDEN)
        return super().list(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        consultation = self.get_object()
        consultation.status = ClinicalConsultation.Status.ANULADA
        consultation.activo = False
        consultation.void_reason = "Anulada desde DELETE."
        consultation.save(update_fields=["status", "activo", "void_reason"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["patch"])
    def finalize(self, request, pk=None):
        consultation = self.get_object()
        if get_role_name(request.user) != "medico":
            return Response({"detail": "Solo medicos pueden finalizar consultas."}, status=status.HTTP_403_FORBIDDEN)
        if consultation.doctor.user_id != request.user.id:
            return Response({"detail": "No puedes finalizar consultas de otro medico."}, status=status.HTTP_403_FORBIDDEN)
        serializer = ClinicalConsultationFinalizeSerializer(data=request.data, context={"consultation": consultation})
        serializer.is_valid(raise_exception=True)
        for field, value in serializer.validated_data.items():
            setattr(consultation, field, value)
        consultation.finalize(request.user)
        return Response(ClinicalConsultationDetailSerializer(consultation).data)

    @action(detail=True, methods=["patch"])
    def void(self, request, pk=None):
        consultation = self.get_object()
        reason = request.data.get("reason", "")
        consultation.status = ClinicalConsultation.Status.ANULADA
        consultation.activo = False
        consultation.void_reason = reason
        consultation.save(update_fields=["status", "activo", "void_reason"])
        return Response(ClinicalConsultationDetailSerializer(consultation).data)

    @action(detail=False, methods=["get"], url_path="my-consultations")
    def my_consultations(self, request):
        if get_role_name(request.user) != "medico":
            return Response({"detail": "Solo disponible para medicos."}, status=status.HTTP_403_FORBIDDEN)
        return Response(ClinicalConsultationListSerializer(self.get_queryset(), many=True).data)

    @action(detail=True, methods=["get", "post", "patch"], url_path="vital-signs")
    def vital_signs(self, request, pk=None):
        role = get_role_name(request.user)
        if request.method != "GET" and role not in VITAL_WRITE_ROLES:
            return Response({"detail": "No tienes permiso para registrar signos vitales."}, status=status.HTTP_403_FORBIDDEN)
        consultation = self.get_object()
        if request.method == "GET":
            signs = getattr(consultation, "vital_signs", None)
            if not signs:
                return Response({"detail": "Esta consulta no tiene signos vitales registrados."}, status=status.HTTP_404_NOT_FOUND)
            return Response(VitalSignsSerializer(signs).data)
        if consultation.status == ClinicalConsultation.Status.FINALIZADA and not request.user.is_superuser:
            return Response({"detail": "No puedes modificar signos vitales de consulta finalizada."}, status=status.HTTP_400_BAD_REQUEST)
        signs = getattr(consultation, "vital_signs", None)
        serializer = VitalSignsSerializer(signs, data=request.data, partial=request.method == "PATCH")
        serializer.is_valid(raise_exception=True)
        serializer.save(consultation=consultation, registrado_por=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED if request.method == "POST" and not signs else status.HTTP_200_OK)

    @action(detail=True, methods=["get", "post"], url_path="diagnoses")
    def diagnoses(self, request, pk=None):
        from apps.prescriptions.serializers import DiagnosisCreateSerializer, DiagnosisListSerializer

        consultation = self.get_object()
        if request.method == "GET":
            return Response(DiagnosisListSerializer(consultation.diagnoses.filter(activo=True), many=True).data)
        data = {**request.data, "consultation": consultation.id}
        serializer = DiagnosisCreateSerializer(data=data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get", "post"], url_path="prescriptions")
    def prescriptions(self, request, pk=None):
        from apps.prescriptions.serializers import PrescriptionCreateSerializer, PrescriptionListSerializer

        consultation = self.get_object()
        if request.method == "GET":
            return Response(PrescriptionListSerializer(consultation.prescriptions.filter(activo=True), many=True).data)
        data = {**request.data, "consultation": consultation.id}
        serializer = PrescriptionCreateSerializer(data=data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        prescription = serializer.save()
        return Response(PrescriptionListSerializer(prescription).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get", "post"], url_path="medical-orders")
    def medical_orders(self, request, pk=None):
        from apps.prescriptions.serializers import MedicalOrderCreateSerializer, MedicalOrderListSerializer

        consultation = self.get_object()
        if request.method == "GET":
            return Response(MedicalOrderListSerializer(consultation.medical_orders.filter(activo=True), many=True).data)
        data = {**request.data, "consultation": consultation.id}
        serializer = MedicalOrderCreateSerializer(data=data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        return Response(MedicalOrderListSerializer(order).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get", "post"], url_path="consumptions")
    def consumptions(self, request, pk=None):
        consultation = self.get_object()
        if request.method == "GET":
            queryset = consultation.supply_usages.filter(active=True).select_related("clinic", "patient", "doctor__user", "inventory_item", "inventory_lot", "applied_by")
            return Response(ClinicalSupplyUsageSerializer(queryset, many=True).data)
        if get_role_name(request.user) not in CONSUMPTION_WRITE_ROLES:
            return Response({"detail": "No tienes permiso para registrar consumos clinicos."}, status=status.HTTP_403_FORBIDDEN)
        data = {**request.data, "consultation": consultation.id, "patient": consultation.patient_id}
        serializer = ClinicalSupplyUsageCreateSerializer(data=data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        try:
            usage = serializer.save()
        except DjangoValidationError as exc:
            return Response({"detail": exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)
        log_audit_event(request=request, clinic=usage.clinic, action=AuditLog.Action.STOCK_OUT, module=AuditLog.Module.INVENTORY, model_name="ClinicalSupplyUsage", object_id=usage.id, object_repr=usage.description, description="Consumo clinico registrado.", new_values={"inventory_item": usage.inventory_item_id, "quantity": str(usage.quantity), "billable": usage.billable})
        return Response(ClinicalSupplyUsageSerializer(usage).data, status=status.HTTP_201_CREATED)


class ClinicalSupplyUsageViewSet(viewsets.ModelViewSet):
    queryset = ClinicalSupplyUsage.objects.select_related(
        "clinic",
        "patient",
        "consultation",
        "appointment",
        "doctor__user",
        "nurse",
        "inventory_item",
        "inventory_lot",
        "invoice",
        "invoice_item",
        "inventory_movement",
        "applied_by",
    )
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "create":
            return ClinicalSupplyUsageCreateSerializer
        return ClinicalSupplyUsageSerializer

    def get_queryset(self):
        user = self.request.user
        role = get_role_name(user)
        queryset = super().get_queryset()
        if role == "superadmin" or user.is_superuser:
            clinic = self.request.query_params.get("clinic")
            if clinic:
                queryset = queryset.filter(clinic_id=clinic)
        elif role in CONSUMPTION_VIEW_ROLES and user.clinica_id:
            queryset = queryset.filter(clinic_id=user.clinica_id)
            if role == "medico":
                queryset = queryset.filter(Q(doctor__user=user) | Q(applied_by=user))
        elif role == "paciente":
            queryset = queryset.none()
        else:
            queryset = queryset.none()
        p = self.request.query_params
        for param, field in [("patient", "patient_id"), ("consultation", "consultation_id"), ("appointment", "appointment_id"), ("inventory_item", "inventory_item_id"), ("status", "status")]:
            if p.get(param):
                queryset = queryset.filter(**{field: p[param]})
        for param in ["billable", "invoiced", "active"]:
            if p.get(param) is not None:
                queryset = queryset.filter(**{param: p[param].lower() in ["1", "true", "yes", "si"]})
        if p.get("date_from"):
            queryset = queryset.filter(applied_at__date__gte=p["date_from"])
        if p.get("date_to"):
            queryset = queryset.filter(applied_at__date__lte=p["date_to"])
        return queryset

    def list(self, request, *args, **kwargs):
        if get_role_name(request.user) not in CONSUMPTION_VIEW_ROLES:
            return Response({"detail": "No tienes permiso para ver consumos clinicos."}, status=status.HTTP_403_FORBIDDEN)
        return super().list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        if get_role_name(request.user) not in CONSUMPTION_WRITE_ROLES:
            return Response({"detail": "No tienes permiso para registrar consumos clinicos."}, status=status.HTTP_403_FORBIDDEN)
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        try:
            usage = serializer.save()
        except DjangoValidationError as exc:
            return Response({"detail": exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)
        log_audit_event(request=request, clinic=usage.clinic, action=AuditLog.Action.STOCK_OUT, module=AuditLog.Module.INVENTORY, model_name="ClinicalSupplyUsage", object_id=usage.id, object_repr=usage.description, description="Consumo clinico registrado.", new_values={"inventory_item": usage.inventory_item_id, "quantity": str(usage.quantity), "billable": usage.billable})
        return Response(ClinicalSupplyUsageSerializer(usage).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        return Response({"detail": "Los consumos aplicados no se editan; se cancelan si aun no estan facturados."}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    def partial_update(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)

    @action(detail=True, methods=["patch"])
    def cancel(self, request, pk=None):
        usage = self.get_object()
        if get_role_name(request.user) not in CONSUMPTION_WRITE_ROLES:
            return Response({"detail": "No tienes permiso para cancelar consumos clinicos."}, status=status.HTTP_403_FORBIDDEN)
        serializer = ClinicalSupplyUsageCancelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            usage.cancel(user=request.user, reason=serializer.validated_data["reason"])
        except DjangoValidationError as exc:
            return Response({"detail": exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)
        log_audit_event(request=request, clinic=usage.clinic, action=AuditLog.Action.CANCEL, module=AuditLog.Module.INVENTORY, model_name="ClinicalSupplyUsage", object_id=usage.id, object_repr=usage.description, description="Consumo clinico cancelado.", new_values=serializer.validated_data)
        return Response(ClinicalSupplyUsageSerializer(usage).data)


def start_consultation_from_appointment(request, appointment):
    role = get_role_name(request.user)
    if role != "medico":
        return Response({"detail": "Solo medicos pueden iniciar consulta desde una cita."}, status=status.HTTP_403_FORBIDDEN)
    if appointment.status == Appointment.Status.CANCELADA:
        return Response({"detail": "No puedes iniciar consulta desde una cita cancelada."}, status=status.HTTP_400_BAD_REQUEST)
    if hasattr(appointment, "consultation"):
        return Response({"detail": "Esta cita ya tiene una consulta registrada."}, status=status.HTTP_400_BAD_REQUEST)
    if appointment.doctor.user_id != request.user.id:
        return Response({"detail": "No puedes iniciar consultas de citas de otro medico."}, status=status.HTTP_403_FORBIDDEN)
    record, _ = MedicalRecord.objects.get_or_create(patient=appointment.patient, defaults={"clinic": appointment.clinic})
    consultation = ClinicalConsultation.objects.create(
        clinic=appointment.clinic,
        medical_record=record,
        patient=appointment.patient,
        doctor=appointment.doctor,
        appointment=appointment,
        consultation_date=appointment.scheduled_date,
        start_time=appointment.start_time,
        end_time=appointment.end_time,
        chief_complaint=appointment.reason,
        created_by=request.user,
    )
    return Response(ClinicalConsultationDetailSerializer(consultation).data, status=status.HTTP_201_CREATED)


def patient_medical_record_response(request, patient):
    role = get_role_name(request.user)
    if role == "recepcionista":
        return Response({"detail": "No tienes permiso para ver expediente clinico completo."}, status=status.HTTP_403_FORBIDDEN)
    if role not in RECORD_VIEW_ROLES and not (role == "paciente" and patient.user_id == request.user.id):
        return Response({"detail": "No tienes permiso para ver este expediente."}, status=status.HTTP_403_FORBIDDEN)
    if role not in ["superadmin", "paciente"] and patient.clinic_id != request.user.clinica_id:
        return Response({"detail": "No tienes permiso sobre esta clinica."}, status=status.HTTP_403_FORBIDDEN)
    record, _ = MedicalRecord.objects.get_or_create(patient=patient, defaults={"clinic": patient.clinic})
    serializer = MedicalRecordMeSerializer(record) if role == "paciente" else MedicalRecordDetailSerializer(record)
    return Response(serializer.data)


def patient_clinical_history_response(request, patient):
    role = get_role_name(request.user)
    if role == "recepcionista":
        return Response({"detail": "No tienes permiso para ver historial clinico."}, status=status.HTTP_403_FORBIDDEN)
    if role not in RECORD_VIEW_ROLES and not (role == "paciente" and patient.user_id == request.user.id):
        return Response({"detail": "No tienes permiso para ver historial clinico."}, status=status.HTTP_403_FORBIDDEN)
    if role not in ["superadmin", "paciente"] and patient.clinic_id != request.user.clinica_id:
        return Response({"detail": "No tienes permiso sobre esta clinica."}, status=status.HTTP_403_FORBIDDEN)
    record = MedicalRecord.objects.filter(patient=patient).first()
    consultations = ClinicalConsultation.objects.filter(patient=patient).select_related("clinic", "medical_record", "doctor__user", "doctor__specialty")
    if role == "paciente":
        consultations = consultations.filter(status=ClinicalConsultation.Status.FINALIZADA)
    data = {
        "patient": PatientListSerializer(patient).data,
        "medical_record": MedicalRecordDetailSerializer(record).data if record else None,
        "consultations": ClinicalConsultationDetailSerializer(consultations, many=True).data,
        "diagnoses": [],
        "prescriptions": [],
        "medical_orders": [],
        "future_sections": {"exams": [], "documents": []},
    }
    try:
        from apps.prescriptions.models import Diagnosis, MedicalOrder, Prescription
        from apps.prescriptions.serializers import DiagnosisListSerializer, MedicalOrderListSerializer, PrescriptionListSerializer

        data["diagnoses"] = DiagnosisListSerializer(Diagnosis.objects.filter(patient=patient, activo=True), many=True).data
        prescriptions = Prescription.objects.filter(patient=patient, activo=True).prefetch_related("items")
        orders = MedicalOrder.objects.filter(patient=patient, activo=True)
        if role == "paciente":
            prescriptions = prescriptions.filter(status=Prescription.Status.EMITIDA)
        data["prescriptions"] = PrescriptionListSerializer(prescriptions, many=True).data
        data["medical_orders"] = MedicalOrderListSerializer(orders, many=True).data
    except Exception:
        pass
    return Response(data)
