from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.http import Http404
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
    ClinicalConsultationRestrictedDetailSerializer,
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
from apps.patients.serializers import PatientDetailSerializer, PatientListSerializer
from apps.audit.models import AuditLog
from apps.audit.services import log_audit_event


RECORD_VIEW_ROLES = ["admin", "medico", "enfermera"]
RECORD_WRITE_ROLES = ["medico", "enfermera"]
VITAL_WRITE_ROLES = ["medico", "enfermera"]
CONSUMPTION_VIEW_ROLES = ["admin", "medico", "enfermera", "recepcionista"]
CONSUMPTION_WRITE_ROLES = ["admin", "medico", "enfermera"]


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
            queryset = queryset.none()
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
        if get_role_name(request.user) == "superadmin" or request.user.is_superuser:
            return super().retrieve(request, *args, **kwargs)
        if get_role_name(request.user) not in [*RECORD_VIEW_ROLES, "paciente"]:
            return Response({"detail": "No tienes permiso para ver expediente clinico completo."}, status=status.HTTP_403_FORBIDDEN)
        if get_role_name(request.user) == "admin":
            return Response({"detail": "El administrador no tiene acceso al contenido clínico del expediente."}, status=status.HTTP_403_FORBIDDEN)
        return super().retrieve(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        role = get_role_name(request.user)
        if role not in [*RECORD_WRITE_ROLES, "admin"]:
            return Response({"detail": "No tienes permiso para crear expedientes."}, status=status.HTTP_403_FORBIDDEN)
        if role == "admin":
            forbidden = set(request.data.keys()) - {"patient", "record_number"}
            if forbidden:
                return Response(
                    {"detail": "El administrador solo puede inicializar el expediente; los datos clínicos corresponden al equipo asistencial."},
                    status=status.HTTP_403_FORBIDDEN,
                )
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        if get_role_name(request.user) not in RECORD_WRITE_ROLES:
            return Response({"detail": "No tienes permiso para actualizar expedientes."}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        return Response({"detail": "Los expedientes clínicos no se eliminan."}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

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
        "patient_visit__assigned_nurse",
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
        if get_role_name(self.request.user) in ["enfermera", "paciente"]:
            return ClinicalConsultationRestrictedDetailSerializer
        return ClinicalConsultationDetailSerializer

    def get_queryset(self):
        user = self.request.user
        role = get_role_name(user)
        queryset = super().get_queryset()
        if role == "superadmin" or user.is_superuser:
            queryset = queryset.none()
        elif role == "enfermera" and user.clinica_id:
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
        if get_role_name(request.user) not in ["medico", "enfermera", "paciente"]:
            return Response({"detail": "No tienes permiso para listar consultas clinicas."}, status=status.HTTP_403_FORBIDDEN)
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        if get_role_name(request.user) == "superadmin" or request.user.is_superuser:
            return super().retrieve(request, *args, **kwargs)
        if get_role_name(request.user) not in ["medico", "enfermera", "paciente"]:
            return Response({"detail": "No tienes permiso para ver consultas clínicas."}, status=status.HTTP_403_FORBIDDEN)
        return super().retrieve(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        if get_role_name(request.user) != "medico":
            return Response({"detail": "Solo médicos pueden crear consultas clínicas."}, status=status.HTTP_403_FORBIDDEN)
        return super().create(request, *args, **kwargs)

    def _audit_scope_denial(self, request, pk):
        log_audit_event(
            request=request,
            clinic=getattr(request.user, "clinica", None),
            action=AuditLog.Action.PERMISSION_DENIED,
            module=AuditLog.Module.CONSULTATIONS,
            model_name="ClinicalConsultation",
            object_id=pk,
            object_repr=f"Consulta #{pk}",
            description="Intento de acceso a consulta fuera del alcance autorizado.",
            metadata={"requested_consultation": str(pk)},
        )

    def _get_locked_consultation(self, request, pk):
        try:
            return self.get_queryset().select_for_update().get(pk=pk)
        except ClinicalConsultation.DoesNotExist as exc:
            self._audit_scope_denial(request, pk)
            raise Http404 from exc

    @staticmethod
    def _version_conflict(consultation):
        return Response(
            {
                "detail": "La consulta fue modificada desde otra sesion. Actualiza la informacion antes de continuar.",
                "code": "consultation_version_conflict",
                "current_version": consultation.version,
                "updated_at": consultation.actualizado_en,
            },
            status=status.HTTP_409_CONFLICT,
        )

    def _save_update(self, request, pk, *, partial, audit_description):
        with transaction.atomic():
            consultation = self._get_locked_consultation(request, pk)
            if get_role_name(request.user) != "medico" or consultation.doctor.user_id != request.user.id:
                return Response({"detail": "No tienes permiso para editar esta consulta."}, status=status.HTTP_403_FORBIDDEN)
            if consultation.status == ClinicalConsultation.Status.FINALIZADA:
                log_audit_event(
                    request=request,
                    clinic=consultation.clinic,
                    action=AuditLog.Action.PERMISSION_DENIED,
                    module=AuditLog.Module.CONSULTATIONS,
                    obj=consultation,
                    description="Intento de edicion de consulta finalizada.",
                    metadata={"visit": consultation.patient_visit_id},
                )
                return Response({"detail": "No se puede editar una consulta finalizada."}, status=status.HTTP_409_CONFLICT)
            expected_version = request.data.get("expected_version")
            if expected_version is not None and str(expected_version) != str(consultation.version):
                log_audit_event(
                    request=request,
                    clinic=consultation.clinic,
                    action=AuditLog.Action.UPDATE,
                    module=AuditLog.Module.CONSULTATIONS,
                    obj=consultation,
                    description="Conflicto de version al guardar consulta.",
                    status=AuditLog.Status.WARNING,
                    severity=AuditLog.Severity.WARNING,
                    metadata={"expected_version": expected_version, "current_version": consultation.version},
                )
                return self._version_conflict(consultation)
            serializer = ClinicalConsultationUpdateSerializer(
                consultation,
                data=request.data,
                partial=partial,
                context=self.get_serializer_context(),
            )
            serializer.is_valid(raise_exception=True)
            changed_fields = sorted(field for field in serializer.validated_data if field != "expected_version")
            consultation.version += 1
            serializer.save(version=consultation.version)
            log_audit_event(
                request=request,
                clinic=consultation.clinic,
                action=AuditLog.Action.UPDATE,
                module=AuditLog.Module.CONSULTATIONS,
                obj=consultation,
                description=audit_description,
                old_values={"version": consultation.version - 1},
                new_values={"version": consultation.version, "changed_fields": changed_fields},
                metadata={"patient": consultation.patient_id, "visit": consultation.patient_visit_id},
            )
            return Response(ClinicalConsultationDetailSerializer(consultation).data)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        return self._save_update(
            request,
            kwargs["pk"],
            partial=partial,
            audit_description="Consulta clinica guardada.",
        )

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    @action(detail=True, methods=["post", "patch"], url_path="save-draft")
    def save_draft(self, request, pk=None):
        return self._save_update(
            request,
            pk,
            partial=True,
            audit_description="Borrador de consulta guardado.",
        )

    def destroy(self, request, *args, **kwargs):
        consultation = self.get_object()
        if get_role_name(request.user) != "medico" or consultation.doctor.user_id != request.user.id:
            return Response({"detail": "No tienes permiso para anular esta consulta."}, status=status.HTTP_403_FORBIDDEN)
        consultation.status = ClinicalConsultation.Status.ANULADA
        consultation.activo = False
        consultation.void_reason = "Anulada desde DELETE."
        consultation.save(update_fields=["status", "activo", "void_reason"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["patch", "post"])
    def finalize(self, request, pk=None):
        return self._finalize_consultation(request, pk)

    @action(detail=True, methods=["post"], url_path="complete")
    def complete(self, request, pk=None):
        return self._finalize_consultation(request, pk)

    def _finalize_consultation(self, request, pk):
        with transaction.atomic():
            consultation = self._get_locked_consultation(request, pk)
            if get_role_name(request.user) != "medico":
                return Response({"detail": "Solo medicos pueden finalizar consultas."}, status=status.HTTP_403_FORBIDDEN)
            if consultation.doctor.user_id != request.user.id:
                return Response({"detail": "No puedes finalizar consultas de otro medico."}, status=status.HTTP_403_FORBIDDEN)
            if consultation.status == ClinicalConsultation.Status.FINALIZADA:
                data = ClinicalConsultationDetailSerializer(consultation).data
                data.update({"message": "La consulta ya fue finalizada.", "created": False})
                return Response(data)
            draft_prescriptions = consultation.prescriptions.filter(activo=True, status="borrador")
            if draft_prescriptions.exists():
                return Response({"detail": "Hay recetas en borrador. Emítelas o anúlalas antes de finalizar la consulta."}, status=status.HTTP_409_CONFLICT)
            expected_version = request.data.get("expected_version")
            if expected_version is not None and str(expected_version) != str(consultation.version):
                return self._version_conflict(consultation)
            serializer = ClinicalConsultationFinalizeSerializer(data=request.data, context={"consultation": consultation})
            serializer.is_valid(raise_exception=True)
            validated_data = dict(serializer.validated_data)
            validated_data.pop("expected_version", None)
            for field, value in validated_data.items():
                setattr(consultation, field, value)
            consultation.version += 1
            consultation.finalize(request.user)
            if consultation.patient_visit_id:
                from apps.clinic_flow import services as flow

                flow.complete_consultation(consultation.patient_visit, user=request.user, request=request)
            log_audit_event(
                request=request,
                clinic=consultation.clinic,
                action=AuditLog.Action.FINALIZE,
                module=AuditLog.Module.CONSULTATIONS,
                obj=consultation,
                description="Consulta clinica finalizada.",
                old_values={"status": ClinicalConsultation.Status.BORRADOR, "version": consultation.version - 1},
                new_values={"status": consultation.status, "version": consultation.version},
                metadata={"patient": consultation.patient_id, "visit": consultation.patient_visit_id},
            )
            data = ClinicalConsultationDetailSerializer(consultation).data
            data.update({"message": "Consulta finalizada correctamente.", "created": True})
            return Response(data)

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

    @action(detail=True, methods=["get"], url_path="clinical-context")
    def clinical_context(self, request, pk=None):
        try:
            consultation = self.get_queryset().get(pk=pk)
        except ClinicalConsultation.DoesNotExist as exc:
            self._audit_scope_denial(request, pk)
            raise Http404 from exc
        role = get_role_name(request.user)
        if role != "medico" or consultation.doctor.user_id != request.user.id:
            return Response({"detail": "No tienes permiso para acceder al contexto de esta consulta."}, status=status.HTTP_403_FORBIDDEN)

        patient = consultation.patient
        record = consultation.medical_record
        visit = consultation.patient_visit
        current_signs = None
        if visit:
            current_signs = VitalSigns.objects.filter(patient_visit=visit).select_related("registrado_por").order_by("-recorded_at").first()
        recent_signs = VitalSigns.objects.filter(
            Q(patient_visit__patient=patient) | Q(consultation__patient=patient)
        ).select_related("registrado_por", "patient_visit", "consultation").order_by("-recorded_at")[:5]
        recent_consultations = ClinicalConsultation.objects.filter(
            clinic=consultation.clinic,
            patient=patient,
            status=ClinicalConsultation.Status.FINALIZADA,
        ).exclude(pk=consultation.pk).select_related("doctor__user").order_by("-consultation_date", "-creado_en")[:3]

        recent_diagnoses = []
        try:
            from apps.prescriptions.models import Diagnosis
            from apps.prescriptions.serializers import DiagnosisListSerializer

            diagnoses = Diagnosis.objects.filter(
                clinic=consultation.clinic,
                patient=patient,
                activo=True,
            ).select_related("doctor__user", "consultation").order_by("-creado_en")[:5]
            recent_diagnoses = DiagnosisListSerializer(diagnoses, many=True).data
        except Exception:
            recent_diagnoses = []

        triage = None
        if visit:
            triage = {
                "visit_id": visit.id,
                "chief_complaint": visit.reason,
                "initial_assessment": visit.symptoms,
                "priority": visit.priority,
                "notes": visit.notes,
                "triage_started_at": visit.triage_started_at,
                "triage_completed_at": visit.triage_completed_at,
                "nurse_name": visit.assigned_nurse.nombre_completo if visit.assigned_nurse_id else "",
                "vital_signs": VitalSignsSerializer(current_signs).data if current_signs else None,
            }

        data = {
            "consultation_id": consultation.id,
            "version": consultation.version,
            "patient": PatientDetailSerializer(patient).data,
            "current_triage": triage,
            "medical_record": MedicalRecordDetailSerializer(record).data,
            "allergies": record.allergies or patient.alergias or "",
            "chronic_conditions": record.chronic_diseases or patient.enfermedades_cronicas or "",
            "chronic_medications": record.current_medications or "",
            "important_history": {
                "surgical": record.surgical_history or "",
                "family": record.family_history or "",
                "general_notes": record.general_notes or "",
            },
            "recent_diagnoses": recent_diagnoses,
            "recent_vital_signs": VitalSignsSerializer(recent_signs, many=True).data,
            "recent_consultations": ClinicalConsultationDetailSerializer(recent_consultations, many=True).data,
        }
        log_audit_event(
            request=request,
            clinic=consultation.clinic,
            action=AuditLog.Action.VIEW,
            module=AuditLog.Module.MEDICAL_RECORDS,
            obj=consultation,
            description="Contexto clinico de consulta consultado.",
            metadata={"patient": patient.id, "visit": consultation.patient_visit_id},
        )
        return Response(data)

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
        if consultation.status == ClinicalConsultation.Status.FINALIZADA:
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
        replay = bool(getattr(usage, "_idempotent_replay", False))
        if not replay:
            log_audit_event(request=request, clinic=usage.clinic, action=AuditLog.Action.STOCK_OUT, module=AuditLog.Module.INVENTORY, model_name="ClinicalSupplyUsage", object_id=usage.id, object_repr=usage.description, description="Consumo clinico registrado.", new_values={"inventory_item": usage.inventory_item_id, "group_quantity": ClinicalSupplyUsageSerializer(usage).data["group_quantity"], "billable": usage.billable})
        return Response(ClinicalSupplyUsageSerializer(usage).data, status=status.HTTP_200_OK if replay else status.HTTP_201_CREATED)


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
            queryset = queryset.none()
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
        replay = bool(getattr(usage, "_idempotent_replay", False))
        if not replay:
            log_audit_event(request=request, clinic=usage.clinic, action=AuditLog.Action.STOCK_OUT, module=AuditLog.Module.INVENTORY, model_name="ClinicalSupplyUsage", object_id=usage.id, object_repr=usage.description, description="Consumo clinico registrado.", new_values={"inventory_item": usage.inventory_item_id, "group_quantity": ClinicalSupplyUsageSerializer(usage).data["group_quantity"], "billable": usage.billable})
        return Response(ClinicalSupplyUsageSerializer(usage).data, status=status.HTTP_200_OK if replay else status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        return Response({"detail": "Los consumos aplicados no se editan; se cancelan si aun no estan facturados."}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    def destroy(self, request, *args, **kwargs):
        return Response({"detail": "Los consumos clinicos no se eliminan; usa cancelar para revertirlos."}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

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


@transaction.atomic
def start_consultation_from_appointment(request, appointment):
    appointment = Appointment.objects.select_for_update().select_related(
        "clinic", "patient", "doctor__user"
    ).get(pk=appointment.pk)
    role = get_role_name(request.user)
    if role != "medico":
        return Response({"detail": "Solo medicos pueden iniciar consulta desde una cita."}, status=status.HTTP_403_FORBIDDEN)
    if appointment.status == Appointment.Status.CANCELADA:
        return Response({"detail": "No puedes iniciar consulta desde una cita cancelada."}, status=status.HTTP_400_BAD_REQUEST)
    if appointment.doctor.user_id != request.user.id:
        return Response({"detail": "No puedes iniciar consultas de citas de otro medico."}, status=status.HTTP_403_FORBIDDEN)
    existing = ClinicalConsultation.objects.filter(appointment=appointment).first()
    if existing:
        data = ClinicalConsultationDetailSerializer(existing).data
        data.update({"created": False, "message": "La consulta ya estaba iniciada."})
        return Response(data)
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
    log_audit_event(
        request=request,
        clinic=consultation.clinic,
        action=AuditLog.Action.CREATE,
        module=AuditLog.Module.CONSULTATIONS,
        obj=consultation,
        description="Consulta iniciada desde cita.",
        metadata={"appointment": appointment.id, "patient": appointment.patient_id},
    )
    data = ClinicalConsultationDetailSerializer(consultation).data
    data.update({"created": True, "message": "Consulta iniciada."})
    return Response(data, status=status.HTTP_201_CREATED)


def patient_medical_record_response(request, patient):
    role = get_role_name(request.user)
    if role == "recepcionista":
        return Response({"detail": "No tienes permiso para ver expediente clinico completo."}, status=status.HTTP_403_FORBIDDEN)
    if role not in RECORD_VIEW_ROLES and not (role == "paciente" and patient.user_id == request.user.id):
        return Response({"detail": "No tienes permiso para ver este expediente."}, status=status.HTTP_403_FORBIDDEN)
    if role == "superadmin" or request.user.is_superuser:
        return Response({"detail": "Superadmin no puede ver expedientes clinicos de pacientes."}, status=status.HTTP_403_FORBIDDEN)
    if role != "paciente" and patient.clinic_id != request.user.clinica_id:
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
    if role == "superadmin" or request.user.is_superuser:
        return Response({"detail": "Superadmin no puede ver historial clinico de pacientes."}, status=status.HTTP_403_FORBIDDEN)
    if role != "paciente" and patient.clinic_id != request.user.clinica_id:
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
