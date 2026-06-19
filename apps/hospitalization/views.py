from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import get_role_name
from apps.hospitalization.models import HospitalBed, HospitalRoom, HospitalVitalSigns, Hospitalization, MedicationAdministration, NursingNote
from apps.hospitalization.serializers import (
    BedActionSerializer,
    CancelHospitalizationSerializer,
    DischargeSerializer,
    HospitalBedSerializer,
    HospitalRoomSerializer,
    HospitalVitalSignsSerializer,
    HospitalizationCreateSerializer,
    HospitalizationDetailSerializer,
    HospitalizationEventSerializer,
    HospitalizationListSerializer,
    MedicationAdministrationActionSerializer,
    MedicationAdministrationCreateSerializer,
    MedicationAdministrationSerializer,
    NursingNoteSerializer,
    NursingRoundCreateSerializer,
    NursingRoundSerializer,
)
from apps.hospitalization import services


VIEW_ROLES = ["admin", "medico", "enfermera", "recepcionista"]
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
    if role == "paciente":
        return queryset.filter(patient__user=user)
    return queryset.none()


def forbidden(detail="No tienes permiso para realizar esta accion."):
    return Response({"detail": detail}, status=status.HTTP_403_FORBIDDEN)


class HospitalRoomViewSet(viewsets.ModelViewSet):
    serializer_class = HospitalRoomSerializer
    permission_classes = [IsAuthenticated]
    queryset = HospitalRoom.objects.annotate(
        beds_count=Count("beds", distinct=True),
        occupied_beds=Count("beds", filter=Q(beds__status=HospitalBed.Status.OCCUPIED), distinct=True),
    ).select_related("clinic")

    def get_queryset(self):
        queryset = scoped_queryset(self.request, super().get_queryset())
        if self.request.query_params.get("is_active") is not None:
            queryset = queryset.filter(is_active=self.request.query_params["is_active"].lower() in ["1", "true", "yes", "si"])
        return queryset

    def create(self, request, *args, **kwargs):
        if role_name(request.user) not in MANAGE_BEDS_ROLES:
            return forbidden("No tienes permiso para administrar habitaciones.")
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(clinic=user_clinic(request.user))
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        if role_name(request.user) not in MANAGE_BEDS_ROLES:
            return forbidden("No tienes permiso para administrar habitaciones.")
        return super().partial_update(request, *args, **kwargs)


class HospitalBedViewSet(viewsets.ModelViewSet):
    serializer_class = HospitalBedSerializer
    permission_classes = [IsAuthenticated]
    queryset = HospitalBed.objects.select_related("clinic", "room").prefetch_related("active_hospitalizations__patient")

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

    def create(self, request, *args, **kwargs):
        if role_name(request.user) not in MANAGE_BEDS_ROLES:
            return forbidden("No tienes permiso para administrar camas.")
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        room = serializer.validated_data["room"]
        if room.clinic_id != request.user.clinica_id:
            return forbidden("La habitacion no pertenece a tu clinica.")
        serializer.save(clinic=user_clinic(request.user))
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        if role_name(request.user) not in MANAGE_BEDS_ROLES:
            return forbidden("No tienes permiso para administrar camas.")
        return super().partial_update(request, *args, **kwargs)

    @action(detail=False, methods=["get"])
    def available(self, request):
        queryset = self.get_queryset().filter(status=HospitalBed.Status.AVAILABLE, is_active=True)
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
        if self.action == "list":
            return HospitalizationListSerializer
        return HospitalizationDetailSerializer

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
                **({"admission_datetime": serializer.validated_data["admission_datetime"]} if serializer.validated_data.get("admission_datetime") else {}),
            )
        except DjangoValidationError as exc:
            return Response({"detail": exc.messages[0] if hasattr(exc, "messages") else str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(HospitalizationDetailSerializer(hospitalization).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        hospitalization = self.get_object()
        if not hospitalization.is_active and role_name(request.user) != "admin":
            return forbidden("No se puede editar un internamiento cerrado.")
        if role_name(request.user) not in MANAGE_ADMISSIONS_ROLES:
            return forbidden("No tienes permiso para editar internamientos.")
        return super().partial_update(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="assign-bed")
    def assign_bed(self, request, pk=None):
        if role_name(request.user) not in MANAGE_ADMISSIONS_ROLES:
            return forbidden("No tienes permiso para asignar camas.")
        serializer = BedActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            hospitalization = services.assign_bed(self.get_object(), serializer.validated_data["bed"], user=request.user, request=request, notes=serializer.validated_data.get("notes", ""))
        except DjangoValidationError as exc:
            return Response({"detail": exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)
        return Response(HospitalizationDetailSerializer(hospitalization).data)

    @action(detail=True, methods=["post"], url_path="change-bed")
    def change_bed(self, request, pk=None):
        if role_name(request.user) not in MANAGE_ADMISSIONS_ROLES:
            return forbidden("No tienes permiso para cambiar camas.")
        serializer = BedActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            hospitalization = services.change_bed(self.get_object(), serializer.validated_data["bed"], user=request.user, request=request, notes=serializer.validated_data.get("notes", ""))
        except DjangoValidationError as exc:
            return Response({"detail": exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)
        return Response(HospitalizationDetailSerializer(hospitalization).data)

    @action(detail=True, methods=["post"])
    def discharge(self, request, pk=None):
        if role_name(request.user) not in DISCHARGE_ROLES:
            return forbidden("No tienes permiso para dar alta hospitalaria.")
        serializer = DischargeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            hospitalization = services.discharge_hospitalization(self.get_object(), user=request.user, request=request, **serializer.validated_data)
        except DjangoValidationError as exc:
            return Response({"detail": exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)
        return Response(HospitalizationDetailSerializer(hospitalization).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        if role_name(request.user) not in MANAGE_ADMISSIONS_ROLES:
            return forbidden("No tienes permiso para cancelar internamientos.")
        serializer = CancelHospitalizationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            hospitalization = services.cancel_hospitalization(self.get_object(), user=request.user, request=request, reason=serializer.validated_data["reason"])
        except DjangoValidationError as exc:
            return Response({"detail": exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)
        return Response(HospitalizationDetailSerializer(hospitalization).data)

    @action(detail=True, methods=["get", "post"], url_path="vital-signs")
    def vital_signs(self, request, pk=None):
        hospitalization = self.get_object()
        if request.method == "GET":
            return Response(HospitalVitalSignsSerializer(hospitalization.vital_signs.all(), many=True).data)
        if role_name(request.user) not in NURSING_CLINICAL_ROLES:
            return forbidden("No tienes permiso para registrar signos vitales hospitalarios.")
        serializer = HospitalVitalSignsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            signs = services.create_hospital_vital_signs(hospitalization, user=request.user, request=request, **serializer.validated_data)
        except DjangoValidationError as exc:
            return Response(exc.message_dict if hasattr(exc, "message_dict") else {"detail": exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)
        return Response(HospitalVitalSignsSerializer(signs).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get", "post"], url_path="nursing-notes")
    def nursing_notes(self, request, pk=None):
        hospitalization = self.get_object()
        if request.method == "GET":
            return Response(NursingNoteSerializer(hospitalization.nursing_notes.all(), many=True).data)
        if role_name(request.user) not in NURSING_CLINICAL_ROLES:
            return forbidden("No tienes permiso para crear notas de enfermeria.")
        serializer = NursingNoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            note = services.create_nursing_note(hospitalization, user=request.user, request=request, **serializer.validated_data)
        except DjangoValidationError as exc:
            return Response({"detail": exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)
        return Response(NursingNoteSerializer(note).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def events(self, request, pk=None):
        return Response(HospitalizationEventSerializer(self.get_object().events.all(), many=True).data)

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
            nursing_round = services.create_nursing_round(hospitalization, nurse=request.user, request=request, **serializer.validated_data)
        except DjangoValidationError as exc:
            return Response(exc.message_dict if hasattr(exc, "message_dict") else {"detail": exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)
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
            return Response(exc.message_dict if hasattr(exc, "message_dict") else {"detail": exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)
        return Response(MedicationAdministrationSerializer(medication).data, status=status.HTTP_201_CREATED)


class HospitalizationDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not can_view_hospitalization(request.user):
            return forbidden("No tienes permiso para ver hospitalizacion.")
        clinic = user_clinic(request.user)
        hospitalizations = Hospitalization.objects.filter(clinic=clinic)
        beds = HospitalBed.objects.filter(clinic=clinic, is_active=True)
        data = {
            "active_patients": hospitalizations.filter(status__in=Hospitalization.ACTIVE_STATUSES).count(),
            "observation_patients": hospitalizations.filter(status=Hospitalization.Status.OBSERVATION).count(),
            "available_beds": beds.filter(status=HospitalBed.Status.AVAILABLE).count(),
            "occupied_beds": beds.filter(status=HospitalBed.Status.OCCUPIED).count(),
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
            medication = services.mark_medication_administered(medication, nurse=request.user, request=request, notes=serializer.validated_data.get("notes", ""))
        except DjangoValidationError as exc:
            return Response({"detail": exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)
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
            return Response({"detail": exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)
        return Response(MedicationAdministrationSerializer(medication).data)

    @action(detail=True, methods=["post"])
    def delay(self, request, pk=None):
        medication, error = self._get_medication()
        if error:
            return error
        serializer = MedicationAdministrationActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            medication = services.mark_medication_delayed(medication, nurse=request.user, request=request, notes=serializer.validated_data.get("notes", ""))
        except DjangoValidationError as exc:
            return Response({"detail": exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)
        return Response(MedicationAdministrationSerializer(medication).data)
