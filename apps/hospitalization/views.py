from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import get_role_name
from apps.audit.models import AuditLog
from apps.audit.services import log_audit_event
from apps.hospitalization.models import (
    HospitalBed,
    HospitalRoom,
    HospitalVitalSigns,
    Hospitalization,
    DischargeSummary,
    MedicalEvolution,
    MedicalInstruction,
    MedicationAdministration,
    NursingNote,
    TreatmentPlan,
)
from apps.hospitalization.serializers import (
    BedActionSerializer,
    CancelHospitalizationSerializer,
    DischargeSerializer,
    DischargeRequestSerializer,
    DischargeSummarySerializer,
    DischargeSummaryWriteSerializer,
    HospitalBedSerializer,
    HospitalRoomSerializer,
    HospitalVitalSignsSerializer,
    HospitalizationCreateSerializer,
    HospitalizationDetailSerializer,
    HospitalizationEventSerializer,
    HospitalizationListSerializer,
    InstructionStatusSerializer,
    MedicalEvolutionCorrectionSerializer,
    MedicalEvolutionSerializer,
    MedicalInstructionSerializer,
    MedicalInstructionReplaceSerializer,
    MedicationAdministrationActionSerializer,
    MedicationAdministrationCreateSerializer,
    MedicationAdministrationSerializer,
    NursingNoteSerializer,
    NursingNoteCorrectionSerializer,
    NursingRoundCreateSerializer,
    NursingRoundSerializer,
    TreatmentPlanSerializer,
    HospitalConsumptionSerializer,
    HospitalConsumptionCreateSerializer,
)
from apps.billing.serializers import InvoiceDetailSerializer
from apps.hospitalization import services


VIEW_ROLES = ["admin", "medico", "enfermera", "recepcionista"]
CLINICAL_VIEW_ROLES = ["admin", "medico", "enfermera"]
MANAGE_BEDS_ROLES = ["admin", "recepcionista"]
MANAGE_ADMISSIONS_ROLES = ["admin", "medico", "recepcionista"]
NURSING_CLINICAL_ROLES = ["admin", "medico", "enfermera"]
NURSING_WRITE_ROLES = ["enfermera"]
DISCHARGE_ROLES = ["admin", "medico"]


def role_name(user):
    return get_role_name(user)


def user_clinic(user):
    return getattr(user, "clinica", None)


def can_view_hospitalization(user):
    return bool(user and user.is_authenticated and role_name(user) in VIEW_ROLES and user.clinica_id)


def scoped_queryset(request, queryset):
    user = request.user
    role = role_name(user)
    if user.is_superuser or role == "superadmin":
        return queryset.none()
    if role in VIEW_ROLES and user.clinica_id:
        return queryset.filter(clinic_id=user.clinica_id)
    return queryset.none()


def forbidden(detail="No tienes permiso para realizar esta accion."):
    return Response({"detail": detail}, status=status.HTTP_403_FORBIDDEN)


def validation_response(exc):
    response_status = status.HTTP_409_CONFLICT if isinstance(exc, (services.BedUnavailableError, services.DuplicateHospitalizationError)) else status.HTTP_400_BAD_REQUEST
    if hasattr(exc, "message_dict"):
        return Response(exc.message_dict, status=response_status)
    if hasattr(exc, "messages") and exc.messages:
        return Response({"detail": exc.messages[0]}, status=response_status)
    return Response({"detail": str(exc)}, status=response_status)


def doctor_profile(user):
    return getattr(user, "doctor_profile", None) if role_name(user) == "medico" else None


class HospitalRoomViewSet(viewsets.ModelViewSet):
    serializer_class = HospitalRoomSerializer
    permission_classes = [IsAuthenticated]
    queryset = HospitalRoom.objects.annotate(
        beds_count=Count("beds", distinct=True),
        occupied_beds=Count("beds", filter=Q(beds__assignments__id__isnull=False, beds__assignments__released_at__isnull=True), distinct=True),
    ).select_related("clinic")

    def get_queryset(self):
        queryset = scoped_queryset(self.request, super().get_queryset())
        if self.request.query_params.get("is_active") is not None:
            queryset = queryset.filter(is_active=self.request.query_params["is_active"].lower() in ["1", "true", "yes", "si"])
        return queryset

    def list(self, request, *args, **kwargs):
        if not can_view_hospitalization(request.user):
            return forbidden("No tienes permiso para ver habitaciones hospitalarias.")
        return super().list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        if role_name(request.user) not in MANAGE_BEDS_ROLES:
            return forbidden("No tienes permiso para administrar habitaciones.")
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            room = serializer.save(clinic=user_clinic(request.user))
        except DjangoValidationError as exc:
            return validation_response(exc)
        log_audit_event(request=request, user=request.user, clinic=user_clinic(request.user), action=AuditLog.Action.CREATE, module=AuditLog.Module.ADMISSIONS, obj=room, description="Habitacion hospitalaria creada.")
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        if role_name(request.user) not in MANAGE_BEDS_ROLES:
            return forbidden("No tienes permiso para administrar habitaciones.")
        response = super().partial_update(request, *args, **kwargs)
        log_audit_event(request=request, user=request.user, clinic=user_clinic(request.user), action=AuditLog.Action.UPDATE, module=AuditLog.Module.ADMISSIONS, obj=self.get_object(), description="Habitacion hospitalaria actualizada.")
        return response

    def destroy(self, request, *args, **kwargs):
        return Response({"detail": "Las habitaciones con historial no se eliminan; desactiva la habitacion."}, status=status.HTTP_405_METHOD_NOT_ALLOWED)


class HospitalBedViewSet(viewsets.ModelViewSet):
    serializer_class = HospitalBedSerializer
    permission_classes = [IsAuthenticated]
    queryset = HospitalBed.objects.select_related("clinic", "room").annotate(
        active_assignment_count=Count("assignments", filter=Q(assignments__released_at__isnull=True)),
    ).prefetch_related("assignments__hospitalization__patient")

    def get_queryset(self):
        queryset = scoped_queryset(self.request, super().get_queryset())
        p = self.request.query_params
        if p.get("status"):
            queryset = queryset.filter(status=p["status"])
        if p.get("room"):
            queryset = queryset.filter(room_id=p["room"])
        if p.get("available", "").lower() in ["1", "true", "yes", "si"]:
            queryset = queryset.filter(status=HospitalBed.Status.AVAILABLE, is_active=True)
        return queryset

    def list(self, request, *args, **kwargs):
        if not can_view_hospitalization(request.user):
            return forbidden("No tienes permiso para ver camas hospitalarias.")
        return super().list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        if role_name(request.user) not in MANAGE_BEDS_ROLES:
            return forbidden("No tienes permiso para administrar camas.")
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        room = serializer.validated_data["room"]
        if room.clinic_id != request.user.clinica_id:
            return forbidden("La habitacion no pertenece a tu clinica.")
        try:
            bed = serializer.save(clinic=user_clinic(request.user))
        except DjangoValidationError as exc:
            return validation_response(exc)
        log_audit_event(request=request, user=request.user, clinic=user_clinic(request.user), action=AuditLog.Action.CREATE, module=AuditLog.Module.ADMISSIONS, obj=bed, description="Cama hospitalaria creada.")
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        if role_name(request.user) not in MANAGE_BEDS_ROLES:
            return forbidden("No tienes permiso para administrar camas.")
        serializer = self.get_serializer(self.get_object(), data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            serializer.save()
        except DjangoValidationError as exc:
            return validation_response(exc)
        response = Response(serializer.data)
        log_audit_event(request=request, user=request.user, clinic=user_clinic(request.user), action=AuditLog.Action.UPDATE, module=AuditLog.Module.ADMISSIONS, obj=self.get_object(), description="Cama hospitalaria actualizada.")
        return response

    def destroy(self, request, *args, **kwargs):
        return Response({"detail": "Las camas con historial no se eliminan; desactiva la cama."}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    @action(detail=False, methods=["get"])
    def available(self, request):
        if not can_view_hospitalization(request.user):
            return forbidden("No tienes permiso para ver camas hospitalarias.")
        queryset = self.get_queryset().filter(status=HospitalBed.Status.AVAILABLE, is_active=True, room__is_active=True, active_assignment_count=0)
        return Response(self.get_serializer(queryset, many=True).data)


class HospitalizationViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Hospitalization.objects.select_related(
        "clinic",
        "patient",
        "visit",
        "consultation",
        "responsible_doctor__user",
        "admitted_by",
        "discharged_by",
        "current_bed__room",
    ).prefetch_related("bed_assignments__bed", "vital_signs", "nursing_notes", "events")

    def get_serializer_class(self):
        if self.action == "create":
            return HospitalizationCreateSerializer
        if self.action == "list" or (self.action == "retrieve" and role_name(self.request.user) == "recepcionista"):
            return HospitalizationListSerializer
        return HospitalizationDetailSerializer

    def _belongs_to_request_clinic(self, obj):
        clinic_id = getattr(self.request.user, "clinica_id", None)
        if obj is None:
            return True
        return clinic_id is not None and getattr(obj, "clinic_id", clinic_id) == clinic_id

    def _validate_admission_relations(self, validated_data):
        patient = validated_data["patient"]
        related = [
            patient,
            validated_data.get("visit"),
            validated_data.get("consultation"),
            validated_data.get("responsible_doctor"),
            validated_data.get("bed"),
        ]
        if any(not self._belongs_to_request_clinic(item) for item in related):
            return False
        visit = validated_data.get("visit")
        consultation = validated_data.get("consultation")
        if visit and getattr(visit, "patient_id", patient.id) != patient.id:
            return False
        if consultation and getattr(consultation, "patient_id", patient.id) != patient.id:
            return False
        return True

    def get_queryset(self):
        queryset = scoped_queryset(self.request, super().get_queryset())
        p = self.request.query_params
        if p.get("status"):
            queryset = queryset.filter(status=p["status"])
        if p.get("patient"):
            queryset = queryset.filter(patient_id=p["patient"])
        if p.get("active", "").lower() in ["1", "true", "yes", "si"]:
            queryset = queryset.filter(status__in=Hospitalization.ACTIVE_STATUSES)
        if p.get("search"):
            search = p["search"]
            queryset = queryset.filter(Q(patient__nombre_completo__icontains=search) | Q(patient__identidad__icontains=search) | Q(patient__codigo_paciente__icontains=search))
        return queryset

    def list(self, request, *args, **kwargs):
        if not can_view_hospitalization(request.user):
            return forbidden("No tienes permiso para ver hospitalizacion.")
        return super().list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        if role_name(request.user) not in MANAGE_ADMISSIONS_ROLES:
            return forbidden("No tienes permiso para crear internamientos.")
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if not self._validate_admission_relations(serializer.validated_data):
            return Response({"detail": "El recurso solicitado no existe."}, status=status.HTTP_404_NOT_FOUND)
        try:
            hospitalization = services.create_hospitalization(
                clinic=user_clinic(request.user),
                patient=serializer.validated_data["patient"],
                visit=serializer.validated_data.get("visit"),
                consultation=serializer.validated_data.get("consultation"),
                responsible_doctor=serializer.validated_data.get("responsible_doctor"),
                bed=serializer.validated_data.get("bed"),
                admission_source=serializer.validated_data.get("admission_source", Hospitalization.AdmissionSource.RECEPTION),
                status=serializer.validated_data.get("status", Hospitalization.Status.ACTIVE),
                reason=serializer.validated_data["reason"],
                diagnosis_at_admission=serializer.validated_data.get("diagnosis_at_admission", ""),
                user=request.user,
                request=request,
                idempotency_key=(request.headers.get("Idempotency-Key") or "").strip() or None,
                **({"expected_discharge_date": serializer.validated_data["expected_discharge_date"]} if serializer.validated_data.get("expected_discharge_date") else {}),
                **({"admission_datetime": serializer.validated_data["admission_datetime"]} if serializer.validated_data.get("admission_datetime") else {}),
            )
        except DjangoValidationError as exc:
            return validation_response(exc)
        return Response(HospitalizationDetailSerializer(hospitalization).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        hospitalization = self.get_object()
        if not hospitalization.is_active and role_name(request.user) != "admin":
            return forbidden("No se puede editar un internamiento cerrado.")
        if role_name(request.user) not in MANAGE_ADMISSIONS_ROLES:
            return forbidden("No tienes permiso para editar internamientos.")
        forbidden_fields = {"clinic", "patient", "current_bed", "status", "discharge_datetime", "discharged_by"}
        if forbidden_fields.intersection(request.data):
            return Response({"detail": "Utiliza las acciones controladas para cambiar estado, paciente o cama."}, status=status.HTTP_400_BAD_REQUEST)
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        return Response({"detail": "Los internamientos forman parte del historial y no pueden eliminarse."}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    @action(detail=True, methods=["post"], url_path="assign-bed")
    def assign_bed(self, request, pk=None):
        if role_name(request.user) not in MANAGE_ADMISSIONS_ROLES:
            return forbidden("No tienes permiso para asignar camas.")
        serializer = BedActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if not self._belongs_to_request_clinic(serializer.validated_data["bed"]):
            return Response({"detail": "El recurso solicitado no existe."}, status=status.HTTP_404_NOT_FOUND)
        try:
            hospitalization = services.assign_bed(self.get_object(), serializer.validated_data["bed"], user=request.user, request=request, notes=serializer.validated_data.get("notes", ""))
        except DjangoValidationError as exc:
            return validation_response(exc)
        return Response(HospitalizationDetailSerializer(hospitalization).data)

    @action(detail=True, methods=["post"], url_path="change-bed")
    def change_bed(self, request, pk=None):
        if role_name(request.user) not in MANAGE_ADMISSIONS_ROLES:
            return forbidden("No tienes permiso para cambiar camas.")
        serializer = BedActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if not self._belongs_to_request_clinic(serializer.validated_data["bed"]):
            return Response({"detail": "El recurso solicitado no existe."}, status=status.HTTP_404_NOT_FOUND)
        try:
            hospitalization = services.change_bed(self.get_object(), serializer.validated_data["bed"], user=request.user, request=request, notes=serializer.validated_data.get("notes", ""))
        except DjangoValidationError as exc:
            return validation_response(exc)
        return Response(HospitalizationDetailSerializer(hospitalization).data)

    @action(detail=True, methods=["post"])
    def discharge(self, request, pk=None):
        if role_name(request.user) not in DISCHARGE_ROLES:
            return forbidden("No tienes permiso para dar alta hospitalaria.")
        serializer = DischargeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if serializer.validated_data.get("allow_pending_balance") and role_name(request.user) != "admin":
            return forbidden("Solo administracion puede autorizar un saldo pendiente al alta.")
        try:
            hospitalization = services.discharge_hospitalization(self.get_object(), user=request.user, request=request, **serializer.validated_data)
        except DjangoValidationError as exc:
            return validation_response(exc)
        return Response(HospitalizationDetailSerializer(hospitalization).data)

    @action(detail=True, methods=["post"], url_path="request-discharge")
    def request_discharge(self, request, pk=None):
        profile = doctor_profile(request.user)
        if not profile:
            return forbidden("Solo un medico puede solicitar el alta hospitalaria.")
        serializer = DischargeRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            hospitalization = services.request_hospital_discharge(self.get_object(), user=request.user, request=request, **serializer.validated_data)
        except DjangoValidationError as exc:
            return validation_response(exc)
        return Response(HospitalizationDetailSerializer(hospitalization).data)

    @action(detail=True, methods=["get", "post"], url_path="discharge-summary")
    def discharge_summary(self, request, pk=None):
        hospitalization = self.get_object()
        if role_name(request.user) not in CLINICAL_VIEW_ROLES:
            return forbidden("No tienes permiso para ver el resumen de egreso.")
        if request.method == "GET":
            summaries = hospitalization.discharge_summaries.select_related("doctor__user", "signed_by", "prescription")
            return Response(DischargeSummarySerializer(summaries, many=True).data)
        profile = doctor_profile(request.user)
        if not profile:
            return forbidden("Solo un medico puede preparar el resumen de egreso.")
        serializer = DischargeSummaryWriteSerializer(data=request.data, context={"hospitalization": hospitalization})
        serializer.is_valid(raise_exception=True)
        payload = dict(serializer.validated_data)
        correction_reason = payload.pop("correction_reason", "")
        try:
            summary = services.save_discharge_summary(hospitalization, profile, request=request, correction_reason=correction_reason, **payload)
        except DjangoValidationError as exc:
            return validation_response(exc)
        return Response(DischargeSummarySerializer(summary).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="sign-discharge-summary")
    def sign_discharge_summary(self, request, pk=None):
        profile = doctor_profile(request.user)
        if not profile:
            return forbidden("Solo un medico puede firmar el resumen de egreso.")
        summary_id = request.data.get("summary_id")
        summary = self.get_object().discharge_summaries.filter(pk=summary_id).first() if summary_id else self.get_object().discharge_summaries.filter(status=DischargeSummary.Status.DRAFT, doctor=profile).order_by("-version").first()
        if not summary:
            return Response({"detail": "No se encontro un borrador de resumen para firmar."}, status=status.HTTP_404_NOT_FOUND)
        try:
            summary = services.sign_discharge_summary(summary, profile, request=request)
        except DjangoValidationError as exc:
            return validation_response(exc)
        return Response(DischargeSummarySerializer(summary).data)

    @action(detail=True, methods=["get", "post"], url_path="consumptions")
    def consumptions(self, request, pk=None):
        hospitalization = self.get_object()
        if role_name(request.user) not in CLINICAL_VIEW_ROLES:
            return forbidden("No tienes permiso para ver consumos hospitalarios.")
        if request.method == "GET":
            return Response(HospitalConsumptionSerializer(hospitalization.clinical_supply_usages.select_related("inventory_item", "inventory_lot", "applied_by"), many=True).data)
        if role_name(request.user) != "enfermera":
            return forbidden("Solo enfermeria puede registrar consumos hospitalarios.")
        serializer = HospitalConsumptionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = dict(serializer.validated_data)
        payload["idempotency_key"] = (request.headers.get("Idempotency-Key") or payload.get("idempotency_key") or "").strip()
        try:
            usage = services.register_hospital_consumption(hospitalization, request.user, request=request, **payload)
        except DjangoValidationError as exc:
            return validation_response(exc)
        return Response(HospitalConsumptionSerializer(usage).data, status=status.HTTP_200_OK if getattr(usage, "_idempotent_replay", False) else status.HTTP_201_CREATED)

    @action(detail=True, methods=["get", "post"], url_path="hospital-invoice")
    def hospital_invoice(self, request, pk=None):
        if role_name(request.user) not in ["admin", "recepcionista"]:
            return forbidden("No tienes permiso para gestionar la factura hospitalaria.")
        hospitalization = self.get_object()
        if request.method == "GET":
            invoice = getattr(hospitalization, "hospital_invoice", None)
            if not invoice:
                return Response({"invoice": None, "pending_consumptions": hospitalization.clinical_supply_usages.filter(active=True, billable=True, invoiced=False).count()})
            return Response(InvoiceDetailSerializer(invoice).data)
        try:
            invoice, created = services.generate_hospital_invoice(hospitalization, request.user, request=request)
        except DjangoValidationError as exc:
            return validation_response(exc)
        return Response(InvoiceDetailSerializer(invoice).data, status=status.HTTP_201_CREATED if created and request.method == "POST" else status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        if role_name(request.user) not in MANAGE_ADMISSIONS_ROLES:
            return forbidden("No tienes permiso para cancelar internamientos.")
        serializer = CancelHospitalizationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            hospitalization = services.cancel_hospitalization(self.get_object(), user=request.user, request=request, reason=serializer.validated_data["reason"])
        except DjangoValidationError as exc:
            return validation_response(exc)
        return Response(HospitalizationDetailSerializer(hospitalization).data)

    @action(detail=True, methods=["get", "post"], url_path="vital-signs")
    def vital_signs(self, request, pk=None):
        hospitalization = self.get_object()
        if request.method == "GET":
            if role_name(request.user) not in CLINICAL_VIEW_ROLES:
                return forbidden("No tienes permiso para ver signos vitales hospitalarios.")
            return Response(HospitalVitalSignsSerializer(hospitalization.vital_signs.all(), many=True).data)
        if role_name(request.user) not in NURSING_WRITE_ROLES:
            return forbidden("No tienes permiso para registrar signos vitales hospitalarios.")
        serializer = HospitalVitalSignsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            signs = services.create_hospital_vital_signs(hospitalization, user=request.user, request=request, **serializer.validated_data)
        except DjangoValidationError as exc:
            return validation_response(exc)
        return Response(HospitalVitalSignsSerializer(signs).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get", "post"], url_path="nursing-notes")
    def nursing_notes(self, request, pk=None):
        hospitalization = self.get_object()
        if request.method == "GET":
            if role_name(request.user) not in CLINICAL_VIEW_ROLES:
                return forbidden("No tienes permiso para ver notas de enfermeria.")
            return Response(NursingNoteSerializer(hospitalization.nursing_notes.all(), many=True).data)
        if role_name(request.user) not in NURSING_WRITE_ROLES:
            return forbidden("No tienes permiso para crear notas de enfermeria.")
        serializer = NursingNoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            note = services.create_nursing_note(hospitalization, user=request.user, request=request, **serializer.validated_data)
        except DjangoValidationError as exc:
            return validation_response(exc)
        return Response(NursingNoteSerializer(note).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get", "post"])
    def events(self, request, pk=None):
        if role_name(request.user) not in CLINICAL_VIEW_ROLES:
            return forbidden("No tienes permiso para ver eventos clinicos de hospitalizacion.")
        hospitalization = self.get_object()
        if request.method == "GET":
            return Response(HospitalizationEventSerializer(hospitalization.events.all(), many=True).data)
        if role_name(request.user) not in ["medico", "enfermera"]:
            return forbidden("No tienes permiso para registrar eventos clinicos.")
        serializer = HospitalizationEventSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            event = services.create_hospital_event(hospitalization, request.user, request=request, **serializer.validated_data)
        except DjangoValidationError as exc:
            return validation_response(exc)
        return Response(HospitalizationEventSerializer(event).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get", "post"], url_path="evolutions")
    def evolutions(self, request, pk=None):
        hospitalization = self.get_object()
        if role_name(request.user) not in ["admin", "medico", "enfermera"]:
            return forbidden("No tienes permiso para ver evoluciones medicas.")
        queryset = hospitalization.medical_evolutions.select_related("doctor__user")
        profile = doctor_profile(request.user)
        if request.method == "GET":
            if profile:
                queryset = queryset.filter(Q(status__in=[MedicalEvolution.Status.SIGNED, MedicalEvolution.Status.CORRECTION]) | Q(status=MedicalEvolution.Status.DRAFT, doctor=profile))
            else:
                queryset = queryset.exclude(status=MedicalEvolution.Status.DRAFT)
            return Response(MedicalEvolutionSerializer(queryset, many=True).data)
        if not profile:
            return forbidden("Solo un medico puede registrar evoluciones.")
        serializer = MedicalEvolutionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            evolution = services.create_medical_evolution(hospitalization, profile, request=request, **serializer.validated_data)
        except DjangoValidationError as exc:
            return validation_response(exc)
        return Response(MedicalEvolutionSerializer(evolution).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get", "post"], url_path="treatment-plans")
    def treatment_plans(self, request, pk=None):
        hospitalization = self.get_object()
        if role_name(request.user) not in ["admin", "medico", "enfermera"]:
            return forbidden("No tienes permiso para ver planes de tratamiento.")
        if request.method == "GET":
            return Response(TreatmentPlanSerializer(hospitalization.treatment_plans.select_related("doctor__user"), many=True).data)
        profile = doctor_profile(request.user)
        if not profile:
            return forbidden("Solo un medico puede actualizar el plan de tratamiento.")
        serializer = TreatmentPlanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            plan = services.create_treatment_plan(hospitalization, profile, request=request, **serializer.validated_data)
        except DjangoValidationError as exc:
            return validation_response(exc)
        return Response(TreatmentPlanSerializer(plan).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get", "post"], url_path="instructions")
    def instructions(self, request, pk=None):
        hospitalization = self.get_object()
        if role_name(request.user) not in ["admin", "medico", "enfermera"]:
            return forbidden("No tienes permiso para ver indicaciones medicas.")
        if request.method == "GET":
            return Response(MedicalInstructionSerializer(hospitalization.medical_instructions.select_related("doctor__user", "acknowledged_by", "completed_by"), many=True).data)
        profile = doctor_profile(request.user)
        if not profile:
            return forbidden("Solo un medico puede crear indicaciones medicas.")
        serializer = MedicalInstructionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            instruction = services.create_medical_instruction(hospitalization, profile, request=request, **serializer.validated_data)
        except DjangoValidationError as exc:
            return validation_response(exc)
        return Response(MedicalInstructionSerializer(instruction).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="timeline")
    def timeline(self, request, pk=None):
        if role_name(request.user) not in CLINICAL_VIEW_ROLES:
            return forbidden("No tienes permiso para ver la linea de tiempo clinica.")
        hospitalization = self.get_object()
        try:
            limit = min(max(int(request.query_params.get("limit", 50)), 1), 100)
        except (TypeError, ValueError):
            return Response({"detail": "El limite debe ser un numero entero entre 1 y 100."}, status=status.HTTP_400_BAD_REQUEST)
        entries = []
        for event in hospitalization.events.select_related("created_by")[:limit]:
            entries.append({"id": f"event-{event.id}", "type": event.event_type, "title": "Evento hospitalario", "description": event.description, "severity": event.severity, "occurred_at": event.event_datetime, "user": event.created_by.nombre_completo if event.created_by else ""})
        for evolution in hospitalization.medical_evolutions.exclude(status=MedicalEvolution.Status.DRAFT).select_related("doctor__user")[:limit]:
            entries.append({"id": f"evolution-{evolution.id}", "type": "medical_evolution", "title": "Evolucion medica", "description": evolution.progress_notes or evolution.assessment or "Evolucion firmada", "severity": "info", "occurred_at": evolution.signed_at or evolution.creado_en, "user": evolution.doctor.user.nombre_completo})
        for signs in hospitalization.vital_signs.select_related("recorded_by")[:limit]:
            entries.append({"id": f"vitals-{signs.id}", "type": "hospital_vital_signs", "title": "Signos vitales hospitalarios", "description": signs.alert_summary or "Control de signos registrado", "severity": "warning" if signs.is_abnormal else "info", "occurred_at": signs.recorded_at, "user": signs.recorded_by.nombre_completo if signs.recorded_by else ""})
        entries.sort(key=lambda item: item["occurred_at"], reverse=True)
        return Response({"count": min(len(entries), limit), "results": entries[:limit]})

    @action(detail=True, methods=["get", "post"], url_path="nursing-rounds")
    def nursing_rounds(self, request, pk=None):
        hospitalization = self.get_object()
        if request.method == "GET":
            if role_name(request.user) not in NURSING_CLINICAL_ROLES:
                return forbidden("No tienes permiso para ver rondas de enfermeria.")
            return Response(NursingRoundSerializer(hospitalization.nursing_rounds.all(), many=True).data)
        if role_name(request.user) not in NURSING_WRITE_ROLES:
            return forbidden("No tienes permiso para crear rondas de enfermeria.")
        serializer = NursingRoundCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            nursing_round = services.create_nursing_round(hospitalization, nurse=request.user, request=request, idempotency_key=(request.headers.get("Idempotency-Key") or "").strip() or None, **serializer.validated_data)
        except DjangoValidationError as exc:
            return validation_response(exc)
        return Response(NursingRoundSerializer(nursing_round).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get", "post"], url_path="medication-administrations")
    def medication_administrations(self, request, pk=None):
        hospitalization = self.get_object()
        if request.method == "GET":
            if role_name(request.user) not in NURSING_CLINICAL_ROLES:
                return forbidden("No tienes permiso para ver medicamentos hospitalarios.")
            return Response(MedicationAdministrationSerializer(hospitalization.medication_administrations.all(), many=True).data)
        if role_name(request.user) not in NURSING_WRITE_ROLES:
            return forbidden("No tienes permiso para programar medicamentos hospitalarios.")
        serializer = MedicationAdministrationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            medication = services.create_medication_administration(hospitalization, user=request.user, request=request, **serializer.validated_data)
        except DjangoValidationError as exc:
            return validation_response(exc)
        return Response(MedicationAdministrationSerializer(medication).data, status=status.HTTP_201_CREATED)


class MedicalEvolutionViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = MedicalEvolutionSerializer
    queryset = MedicalEvolution.objects.select_related("hospitalization", "doctor__user")

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or role_name(user) not in ["admin", "medico", "enfermera"] or not user.clinica_id:
            return self.queryset.none()
        return self.queryset.filter(hospitalization__clinic_id=user.clinica_id)

    @action(detail=True, methods=["post"])
    def sign(self, request, pk=None):
        profile = doctor_profile(request.user)
        if not profile:
            return forbidden("Solo un medico puede firmar evoluciones.")
        try:
            evolution = services.sign_medical_evolution(self.get_object(), profile, request=request)
        except DjangoValidationError as exc:
            return validation_response(exc)
        return Response(MedicalEvolutionSerializer(evolution).data)

    @action(detail=True, methods=["post"])
    def correct(self, request, pk=None):
        profile = doctor_profile(request.user)
        if not profile:
            return forbidden("Solo un medico puede corregir evoluciones.")
        serializer = MedicalEvolutionCorrectionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = dict(serializer.validated_data)
        reason = payload.pop("correction_reason")
        try:
            evolution = services.correct_medical_evolution(self.get_object(), profile, reason, request=request, **payload)
        except DjangoValidationError as exc:
            return validation_response(exc)
        return Response(MedicalEvolutionSerializer(evolution).data, status=status.HTTP_201_CREATED)


class MedicalInstructionViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = MedicalInstructionSerializer
    queryset = MedicalInstruction.objects.select_related("hospitalization", "doctor__user", "acknowledged_by", "completed_by")

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or role_name(user) not in ["admin", "medico", "enfermera"] or not user.clinica_id:
            return self.queryset.none()
        return self.queryset.filter(hospitalization__clinic_id=user.clinica_id)

    @action(detail=True, methods=["post"])
    def acknowledge(self, request, pk=None):
        if role_name(request.user) != "enfermera":
            return forbidden("Solo enfermeria puede confirmar la lectura.")
        try:
            instruction = services.acknowledge_medical_instruction(self.get_object(), request.user, request=request)
        except DjangoValidationError as exc:
            return validation_response(exc)
        return Response(MedicalInstructionSerializer(instruction).data)

    def _change_status(self, request, next_status, doctor_required=False):
        serializer = InstructionStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = doctor_profile(request.user)
        if doctor_required and not profile:
            return forbidden("Solo un medico puede suspender o cancelar indicaciones.")
        if not doctor_required and role_name(request.user) not in ["medico", "enfermera"]:
            return forbidden("No tienes permiso para actualizar esta indicacion.")
        instruction = self.get_object()
        if profile and instruction.doctor_id != profile.id and doctor_required:
            return forbidden("Solo el medico responsable puede cambiar esta indicacion.")
        try:
            instruction = services.change_medical_instruction_status(
                instruction,
                profile or instruction.doctor,
                next_status,
                serializer.validated_data.get("reason", ""),
                request=request,
                user=request.user,
            )
        except DjangoValidationError as exc:
            return validation_response(exc)
        return Response(MedicalInstructionSerializer(instruction).data)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        return self._change_status(request, MedicalInstruction.Status.COMPLETED)

    @action(detail=True, methods=["post"], url_path="start")
    def start(self, request, pk=None):
        return self._change_status(request, MedicalInstruction.Status.IN_PROGRESS)

    @action(detail=True, methods=["post"])
    def suspend(self, request, pk=None):
        return self._change_status(request, MedicalInstruction.Status.SUSPENDED, doctor_required=True)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        return self._change_status(request, MedicalInstruction.Status.CANCELLED, doctor_required=True)

    @action(detail=True, methods=["post"])
    def replace(self, request, pk=None):
        profile = doctor_profile(request.user)
        if not profile:
            return forbidden("Solo un medico puede reemplazar indicaciones.")
        serializer = MedicalInstructionReplaceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = dict(serializer.validated_data)
        reason = payload.pop("reason")
        try:
            instruction = services.replace_medical_instruction(self.get_object(), profile, reason, request=request, **payload)
        except DjangoValidationError as exc:
            return validation_response(exc)
        return Response(MedicalInstructionSerializer(instruction).data, status=status.HTTP_201_CREATED)


class NursingNoteViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = NursingNoteSerializer
    queryset = NursingNote.objects.select_related("hospitalization", "created_by")

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or role_name(user) not in ["admin", "enfermera"] or not user.clinica_id:
            return self.queryset.none()
        return self.queryset.filter(hospitalization__clinic_id=user.clinica_id)

    @action(detail=True, methods=["post"])
    def correct(self, request, pk=None):
        serializer = NursingNoteCorrectionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            correction = services.correct_nursing_note(self.get_object(), request.user, serializer.validated_data["reason"], serializer.validated_data["note"], request=request)
        except DjangoValidationError as exc:
            return validation_response(exc)
        return Response(NursingNoteSerializer(correction).data, status=status.HTTP_201_CREATED)


class HospitalizationDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not can_view_hospitalization(request.user):
            return forbidden("No tienes permiso para ver hospitalizacion.")
        clinic = user_clinic(request.user)
        hospitalizations = Hospitalization.objects.filter(clinic=clinic)
        beds = HospitalBed.objects.filter(clinic=clinic, is_active=True).annotate(
            active_assignment_count=Count("assignments", filter=Q(assignments__released_at__isnull=True)),
        )
        data = {
            "active_patients": hospitalizations.filter(status__in=Hospitalization.ACTIVE_STATUSES).count(),
            "observation_patients": hospitalizations.filter(status=Hospitalization.Status.OBSERVATION).count(),
            "available_beds": beds.filter(status=HospitalBed.Status.AVAILABLE, room__is_active=True, active_assignment_count=0).count(),
            "occupied_beds": beds.filter(active_assignment_count__gt=0).count(),
            "cleaning_beds": beds.filter(status=HospitalBed.Status.CLEANING).count(),
            "maintenance_beds": beds.filter(status=HospitalBed.Status.MAINTENANCE).count(),
            "discharges_today": hospitalizations.filter(status=Hospitalization.Status.DISCHARGED, discharge_datetime__date=timezone.localdate()).count(),
            "urgent_notes": NursingNote.objects.filter(hospitalization__clinic=clinic, hospitalization__status__in=Hospitalization.ACTIVE_STATUSES, note_type=NursingNote.NoteType.URGENT).count(),
            "recent_vital_signs": HospitalVitalSigns.objects.filter(hospitalization__clinic=clinic).count(),
        }
        return Response(data)


class PendingMedicationsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if role_name(request.user) not in NURSING_CLINICAL_ROLES or not request.user.clinica_id or request.user.is_superuser:
            return forbidden("No tienes permiso para ver medicamentos pendientes.")
        queryset = services.get_pending_medications(user_clinic(request.user))
        return Response(MedicationAdministrationSerializer(queryset, many=True).data)


class MedicationAdministrationViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = MedicationAdministrationSerializer
    queryset = MedicationAdministration.objects.select_related("clinic", "hospitalization", "patient", "administered_by", "prescription", "prescription_item")

    def get_queryset(self):
        return scoped_queryset(self.request, super().get_queryset())

    def _get_medication(self):
        medication = self.get_object()
        if role_name(self.request.user) not in NURSING_WRITE_ROLES:
            return None, forbidden("No tienes permiso para administrar medicamentos hospitalarios.")
        return medication, None

    @action(detail=True, methods=["post"])
    def administer(self, request, pk=None):
        medication, error = self._get_medication()
        if error:
            return error
        serializer = MedicationAdministrationActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            medication = services.mark_medication_administered(medication, nurse=request.user, request=request, **serializer.validated_data)
        except DjangoValidationError as exc:
            return validation_response(exc)
        return Response(MedicationAdministrationSerializer(medication).data)

    @action(detail=True, methods=["post"])
    def omit(self, request, pk=None):
        medication, error = self._get_medication()
        if error:
            return error
        serializer = MedicationAdministrationActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            medication = services.mark_medication_omitted(medication, nurse=request.user, request=request, reason=serializer.validated_data.get("reason", ""), notes=serializer.validated_data.get("notes", ""))
        except DjangoValidationError as exc:
            return validation_response(exc)
        return Response(MedicationAdministrationSerializer(medication).data)

    @action(detail=True, methods=["post"])
    def delay(self, request, pk=None):
        medication, error = self._get_medication()
        if error:
            return error
        serializer = MedicationAdministrationActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            medication = services.mark_medication_delayed(medication, nurse=request.user, request=request, notes=serializer.validated_data.get("reason") or serializer.validated_data.get("notes", ""))
        except DjangoValidationError as exc:
            return validation_response(exc)
        return Response(MedicationAdministrationSerializer(medication).data)

    @action(detail=True, methods=["post"])
    def refuse(self, request, pk=None):
        medication, error = self._get_medication()
        if error:
            return error
        serializer = MedicationAdministrationActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            medication = services.mark_medication_refused(medication, request.user, serializer.validated_data.get("reason", ""), request=request, notes=serializer.validated_data.get("notes", ""))
        except DjangoValidationError as exc:
            return validation_response(exc)
        return Response(MedicationAdministrationSerializer(medication).data)

    @action(detail=True, methods=["post"])
    def unavailable(self, request, pk=None):
        medication, error = self._get_medication()
        if error:
            return error
        serializer = MedicationAdministrationActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            medication = services.mark_medication_unavailable(medication, request.user, serializer.validated_data.get("reason", ""), request=request, notes=serializer.validated_data.get("notes", ""))
        except DjangoValidationError as exc:
            return validation_response(exc)
        return Response(MedicationAdministrationSerializer(medication).data)

    @action(detail=True, methods=["post"])
    def reverse(self, request, pk=None):
        if role_name(request.user) != "admin":
            return forbidden("Solo administracion puede autorizar la reversion de una administracion.")
        serializer = MedicationAdministrationActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            medication = services.reverse_medication_administration(self.get_object(), request.user, serializer.validated_data.get("reason", ""), request=request)
        except DjangoValidationError as exc:
            return validation_response(exc)
        return Response(MedicationAdministrationSerializer(medication).data)
