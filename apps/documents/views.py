from django.db.models import Count, Q, Sum
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import get_role_name
from apps.appointments.models import Appointment
from apps.audit.models import AuditLog
from apps.audit.services import log_audit_event
from apps.clinic_settings.models import get_or_create_clinic_settings
from apps.documents.models import ClinicalDocument, DocumentCategory
from apps.documents.permissions import can_access_document, can_list_documents, can_manage_document, can_upload_documents, is_superadmin
from apps.documents.serializers import (
    ClinicalDocumentCreateSerializer,
    ClinicalDocumentDetailSerializer,
    ClinicalDocumentListSerializer,
    ClinicalDocumentReplaceSerializer,
    ClinicalDocumentStatsSerializer,
    ClinicalDocumentUpdateSerializer,
    DocumentCategoryCreateSerializer,
    DocumentCategorySerializer,
    PatientPortalDocumentSerializer,
)
from apps.documents.utils import calculate_checksum, file_extension
from apps.medical_records.models import ClinicalConsultation, MedicalRecord
from apps.notifications.models import Notification
from apps.notifications.services import create_notification
from apps.patients.models import Patient
from apps.prescriptions.models import MedicalOrder


def bool_param(value):
    if value is None:
        return None
    return str(value).lower() in ["1", "true", "yes", "si"]


def notify_patient_if_visible(document):
    if document.visible_to_patient and document.patient.user_id:
        create_notification(
            document.patient.user,
            "Nuevo documento disponible",
            f"Se publico un documento en tu expediente: {document.title}.",
            clinic=document.clinic,
            notification_type=Notification.Type.INFO,
            module=Notification.Module.MEDICAL_RECORDS,
            priority=Notification.Priority.NORMAL,
            related_model="ClinicalDocument",
            related_object_id=document.id,
            action_url=f"/patient/documents/{document.id}",
        )


class DocumentCategoryViewSet(viewsets.ModelViewSet):
    queryset = DocumentCategory.objects.select_related("clinic")
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        return DocumentCategoryCreateSerializer if self.action in ["create", "update", "partial_update"] else DocumentCategorySerializer

    def get_queryset(self):
        user = self.request.user
        role = get_role_name(user)
        qs = super().get_queryset()
        if is_superadmin(user):
            pass
        elif role in ["admin", "medico", "enfermera", "recepcionista"] and user.clinica_id:
            qs = qs.filter(Q(clinic__isnull=True) | Q(clinic_id=user.clinica_id))
        else:
            qs = qs.none()
        params = self.request.query_params
        if params.get("search"):
            qs = qs.filter(Q(name__icontains=params["search"]) | Q(description__icontains=params["search"]))
        if params.get("type"):
            qs = qs.filter(document_type=params["type"])
        if params.get("active") is not None:
            qs = qs.filter(active=bool_param(params.get("active")))
        if params.get("clinic") and is_superadmin(user):
            qs = qs.filter(clinic_id=params["clinic"])
        return qs

    def create(self, request, *args, **kwargs):
        if get_role_name(request.user) not in ["superadmin", "admin"]:
            return Response({"detail": "No tienes permiso para crear categorias."}, status=status.HTTP_403_FORBIDDEN)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        clinic = serializer.validated_data.get("clinic")
        if not is_superadmin(request.user):
            clinic = request.user.clinica
        category = serializer.save(clinic=clinic)
        return Response(DocumentCategorySerializer(category).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        if get_role_name(request.user) not in ["superadmin", "admin"]:
            return Response({"detail": "No tienes permiso para editar categorias."}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        category = self.get_object()
        if get_role_name(request.user) not in ["superadmin", "admin"]:
            return Response({"detail": "No tienes permiso para desactivar categorias."}, status=status.HTTP_403_FORBIDDEN)
        category.active = False
        category.save(update_fields=["active", "actualizado_en"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class ClinicalDocumentViewSet(viewsets.ModelViewSet):
    queryset = ClinicalDocument.objects.select_related(
        "clinic", "patient", "patient__user", "category", "uploaded_by", "medical_record",
        "consultation", "appointment", "prescription", "medical_order", "invoice",
    )
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_serializer_class(self):
        if self.action == "create":
            return ClinicalDocumentCreateSerializer
        if self.action in ["update", "partial_update"]:
            return ClinicalDocumentUpdateSerializer
        if self.action == "replace":
            return ClinicalDocumentReplaceSerializer
        if self.action == "list":
            return ClinicalDocumentListSerializer
        return ClinicalDocumentDetailSerializer

    def get_queryset(self):
        user = self.request.user
        role = get_role_name(user)
        qs = super().get_queryset()
        if is_superadmin(user):
            qs = qs.none()
        elif role in ["admin", "medico", "enfermera", "recepcionista"] and user.clinica_id:
            qs = qs.filter(clinic_id=user.clinica_id)
            if role == "recepcionista":
                qs = qs.filter(is_sensitive=False, category__document_type__in=["administrative", "identity", "consent", "billing", "other"])
        elif role == "paciente":
            qs = qs.filter(patient__user=user, visible_to_patient=True, status=ClinicalDocument.Status.ACTIVE, active=True)
        else:
            qs = qs.none()

        params = self.request.query_params
        filters = {
            "patient": "patient_id",
            "medical_record": "medical_record_id",
            "consultation": "consultation_id",
            "appointment": "appointment_id",
            "prescription": "prescription_id",
            "medical_order": "medical_order_id",
            "invoice": "invoice_id",
            "category": "category_id",
            "uploaded_by": "uploaded_by_id",
            "status": "status",
        }
        for param, field in filters.items():
            if params.get(param):
                qs = qs.filter(**{field: params[param]})
        if params.get("document_type"):
            qs = qs.filter(category__document_type=params["document_type"])
        for param in ["visible_to_patient", "is_sensitive", "active"]:
            if params.get(param) is not None:
                qs = qs.filter(**{param: bool_param(params[param])})
        if params.get("date_from"):
            qs = qs.filter(creado_en__date__gte=params["date_from"])
        if params.get("date_to"):
            qs = qs.filter(creado_en__date__lte=params["date_to"])
        if params.get("search"):
            search = params["search"]
            qs = qs.filter(Q(title__icontains=search) | Q(description__icontains=search) | Q(original_filename__icontains=search) | Q(tags__icontains=search))
        ordering = params.get("ordering")
        allowed_ordering = {
            "creado_en": "creado_en",
            "-creado_en": "-creado_en",
            "title": "title",
            "-title": "-title",
            "file_size": "file_size",
            "-file_size": "-file_size",
            "category": "category__name",
            "-category": "-category__name",
        }
        if ordering in allowed_ordering:
            qs = qs.order_by(allowed_ordering[ordering])
        return qs

    def list(self, request, *args, **kwargs):
        if not can_list_documents(request.user):
            return Response({"detail": "No tienes permiso para listar documentos."}, status=status.HTTP_403_FORBIDDEN)
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        document = self.get_object()
        if not can_access_document(request.user, document):
            return Response({"detail": "No tienes permiso para ver este documento."}, status=status.HTTP_403_FORBIDDEN)
        return Response(self.get_serializer(document).data)

    def create(self, request, *args, **kwargs):
        if not can_upload_documents(request.user):
            return Response({"detail": "No tienes permiso para subir documentos."}, status=status.HTTP_403_FORBIDDEN)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        document = serializer.save()
        log_audit_event(request=request, clinic=document.clinic, action=AuditLog.Action.CREATE, module=AuditLog.Module.MEDICAL_RECORDS, model_name="ClinicalDocument", object_id=document.id, object_repr=document.title, description="Documento clinico subido.")
        notify_patient_if_visible(document)
        return Response(ClinicalDocumentDetailSerializer(document, context={"request": request}).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        document = self.get_object()
        if not can_manage_document(request.user, document):
            return Response({"detail": "No tienes permiso para editar este documento."}, status=status.HTTP_403_FORBIDDEN)
        old_visible = document.visible_to_patient
        response = super().update(request, *args, **kwargs)
        document.refresh_from_db()
        if not old_visible and document.visible_to_patient:
            notify_patient_if_visible(document)
        return response

    def destroy(self, request, *args, **kwargs):
        document = self.get_object()
        if not can_manage_document(request.user, document):
            return Response({"detail": "No tienes permiso para eliminar este documento."}, status=status.HTTP_403_FORBIDDEN)
        document.status = ClinicalDocument.Status.DELETED
        document.active = False
        document.save(update_fields=["status", "active", "actualizado_en"])
        log_audit_event(request=request, clinic=document.clinic, action=AuditLog.Action.DELETE, module=AuditLog.Module.MEDICAL_RECORDS, model_name="ClinicalDocument", object_id=document.id, object_repr=document.title, description="Documento eliminado logicamente.")
        return Response(status=status.HTTP_204_NO_CONTENT)

    def _file_response(self, request, document, inline=False):
        if document.status == ClinicalDocument.Status.DELETED or not document.file:
            return Response({"detail": "Documento no disponible."}, status=status.HTTP_404_NOT_FOUND)
        if not can_access_document(request.user, document, for_download=True):
            log_audit_event(request=request, clinic=document.clinic, action=AuditLog.Action.PERMISSION_DENIED, module=AuditLog.Module.MEDICAL_RECORDS, model_name="ClinicalDocument", object_id=document.id, object_repr=document.title, description="Intento denegado de acceso a documento.")
            return Response({"detail": "No tienes permiso para descargar este documento."}, status=status.HTTP_403_FORBIDDEN)
        response = FileResponse(document.file.open("rb"), as_attachment=not inline, filename=document.original_filename)
        response["Content-Type"] = document.mime_type or "application/octet-stream"
        log_audit_event(request=request, clinic=document.clinic, action=AuditLog.Action.VIEW, module=AuditLog.Module.MEDICAL_RECORDS, model_name="ClinicalDocument", object_id=document.id, object_repr=document.title, description="Documento descargado o previsualizado.")
        return response

    @action(detail=True, methods=["get"])
    def download(self, request, pk=None):
        return self._file_response(request, self.get_object(), inline=False)

    @action(detail=True, methods=["get"])
    def preview(self, request, pk=None):
        document = self.get_object()
        if document.file_extension not in ["pdf", "jpg", "jpeg", "png", "webp"]:
            return Response({"detail": "Vista previa no disponible para este tipo de archivo.", "download_url": request.build_absolute_uri(f"/api/documents/{document.id}/download/")})
        return self._file_response(request, document, inline=True)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        if get_role_name(request.user) == "paciente":
            return Response({"detail": "No tienes permiso para ver estadisticas."}, status=status.HTTP_403_FORBIDDEN)
        qs = self.get_queryset()
        total_size = qs.aggregate(total=Sum("file_size"))["total"] or 0
        data = {
            "total_documents": qs.count(),
            "active_documents": qs.filter(status=ClinicalDocument.Status.ACTIVE, active=True).count(),
            "archived_documents": qs.filter(status=ClinicalDocument.Status.ARCHIVED).count(),
            "deleted_documents": qs.filter(status=ClinicalDocument.Status.DELETED).count(),
            "visible_to_patient": qs.filter(visible_to_patient=True).count(),
            "sensitive_documents": qs.filter(is_sensitive=True).count(),
            "total_storage_mb": round(total_size / (1024 * 1024), 2),
            "documents_by_type": list(qs.values("category__document_type").annotate(count=Count("id")).order_by("category__document_type")),
        }
        return Response(ClinicalDocumentStatsSerializer(data).data)

    @action(detail=True, methods=["patch"], url_path="archive")
    def archive(self, request, pk=None):
        return self._set_status(request, ClinicalDocument.Status.ARCHIVED, "Documento archivado.")

    @action(detail=True, methods=["patch"], url_path="restore")
    def restore(self, request, pk=None):
        document = self.get_object()
        if not can_manage_document(request.user, document):
            return Response({"detail": "No tienes permiso para restaurar este documento."}, status=status.HTTP_403_FORBIDDEN)
        document.status = ClinicalDocument.Status.ACTIVE
        document.active = True
        document.save(update_fields=["status", "active", "actualizado_en"])
        return Response(ClinicalDocumentDetailSerializer(document, context={"request": request}).data)

    def _set_status(self, request, status_value, description):
        document = self.get_object()
        if not can_manage_document(request.user, document):
            return Response({"detail": "No tienes permiso para modificar este documento."}, status=status.HTTP_403_FORBIDDEN)
        document.status = status_value
        document.active = status_value != ClinicalDocument.Status.DELETED
        document.save(update_fields=["status", "active", "actualizado_en"])
        log_audit_event(request=request, clinic=document.clinic, action=AuditLog.Action.UPDATE, module=AuditLog.Module.MEDICAL_RECORDS, model_name="ClinicalDocument", object_id=document.id, object_repr=document.title, description=description)
        return Response(ClinicalDocumentDetailSerializer(document, context={"request": request}).data)

    @action(detail=True, methods=["patch"], url_path="mark-visible-to-patient")
    def mark_visible_to_patient(self, request, pk=None):
        document = self.get_object()
        if not can_manage_document(request.user, document):
            return Response({"detail": "No tienes permiso para cambiar visibilidad."}, status=status.HTTP_403_FORBIDDEN)
        document.visible_to_patient = True
        document.save(update_fields=["visible_to_patient", "actualizado_en"])
        notify_patient_if_visible(document)
        return Response(ClinicalDocumentDetailSerializer(document, context={"request": request}).data)

    @action(detail=True, methods=["patch"], url_path="mark-hidden-from-patient")
    def mark_hidden_from_patient(self, request, pk=None):
        document = self.get_object()
        if not can_manage_document(request.user, document):
            return Response({"detail": "No tienes permiso para cambiar visibilidad."}, status=status.HTTP_403_FORBIDDEN)
        document.visible_to_patient = False
        document.save(update_fields=["visible_to_patient", "actualizado_en"])
        return Response(ClinicalDocumentDetailSerializer(document, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="replace")
    def replace(self, request, pk=None):
        old = self.get_object()
        if not can_manage_document(request.user, old):
            return Response({"detail": "No tienes permiso para reemplazar este documento."}, status=status.HTTP_403_FORBIDDEN)
        serializer = ClinicalDocumentReplaceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        uploaded_file = serializer.validated_data["file"]
        new_document = ClinicalDocument.objects.create(
            clinic=old.clinic,
            patient=old.patient,
            medical_record=old.medical_record,
            consultation=old.consultation,
            appointment=old.appointment,
            prescription=old.prescription,
            medical_order=old.medical_order,
            invoice=old.invoice,
            category=old.category,
            title=serializer.validated_data.get("title") or old.title,
            description=serializer.validated_data.get("description", old.description),
            file=uploaded_file,
            original_filename=uploaded_file.name,
            file_type=file_extension(uploaded_file.name),
            mime_type=getattr(uploaded_file, "content_type", "") or "",
            file_size=uploaded_file.size,
            file_extension=file_extension(uploaded_file.name),
            uploaded_by=request.user,
            visible_to_patient=serializer.validated_data.get("visible_to_patient", old.visible_to_patient),
            is_sensitive=serializer.validated_data.get("is_sensitive", old.is_sensitive),
            version=old.version + 1,
            checksum=calculate_checksum(uploaded_file),
            tags=serializer.validated_data.get("tags", old.tags),
            notes=serializer.validated_data.get("notes", old.notes),
        )
        old.status = ClinicalDocument.Status.ARCHIVED
        old.replaced_by = new_document
        old.save(update_fields=["status", "replaced_by", "actualizado_en"])
        log_audit_event(request=request, clinic=old.clinic, action=AuditLog.Action.UPDATE, module=AuditLog.Module.MEDICAL_RECORDS, model_name="ClinicalDocument", object_id=old.id, object_repr=old.title, description="Documento reemplazado.", new_values={"new_document": new_document.id})
        notify_patient_if_visible(new_document)
        return Response(ClinicalDocumentDetailSerializer(new_document, context={"request": request}).data, status=status.HTTP_201_CREATED)


class RelatedDocumentsView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    serializer_class = ClinicalDocumentListSerializer
    model = None
    lookup_kwarg = ""
    relation_field = ""

    def get_related_object(self):
        return get_object_or_404(self.model, id=self.kwargs[self.lookup_kwarg])

    def get_patient(self, obj):
        return obj if isinstance(obj, Patient) else obj.patient

    def get(self, request, *args, **kwargs):
        obj = self.get_related_object()
        patient = self.get_patient(obj)
        viewset = ClinicalDocumentViewSet()
        viewset.request = request
        qs = viewset.get_queryset().filter(patient=patient, **({self.relation_field: obj} if self.relation_field else {}))
        return Response(ClinicalDocumentListSerializer(qs, many=True, context={"request": request}).data)

    def post(self, request, *args, **kwargs):
        obj = self.get_related_object()
        patient = self.get_patient(obj)
        data = request.data.copy()
        data["patient"] = patient.id
        if self.relation_field:
            data[self.relation_field] = obj.id
        serializer = ClinicalDocumentCreateSerializer(data=data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        document = serializer.save()
        notify_patient_if_visible(document)
        return Response(ClinicalDocumentDetailSerializer(document, context={"request": request}).data, status=status.HTTP_201_CREATED)


class PatientDocumentsView(RelatedDocumentsView):
    model = Patient
    lookup_kwarg = "patient_id"
    relation_field = ""


class MedicalRecordDocumentsView(RelatedDocumentsView):
    model = MedicalRecord
    lookup_kwarg = "record_id"
    relation_field = "medical_record"


class ConsultationDocumentsView(RelatedDocumentsView):
    model = ClinicalConsultation
    lookup_kwarg = "consultation_id"
    relation_field = "consultation"


class AppointmentDocumentsView(RelatedDocumentsView):
    model = Appointment
    lookup_kwarg = "appointment_id"
    relation_field = "appointment"


class MedicalOrderDocumentsView(RelatedDocumentsView):
    model = MedicalOrder
    lookup_kwarg = "order_id"
    relation_field = "medical_order"


class PatientPortalDocumentsView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PatientPortalDocumentSerializer

    def get_queryset(self, request):
        patient = Patient.objects.filter(user=request.user, activo=True).first()
        if not patient:
            return ClinicalDocument.objects.none()
        settings = get_or_create_clinic_settings(patient.clinic)
        if not settings.allow_patient_portal or not settings.allow_patient_medical_record_view:
            return ClinicalDocument.objects.none()
        qs = ClinicalDocument.objects.select_related("category", "patient", "clinic").filter(patient=patient, visible_to_patient=True, active=True, status=ClinicalDocument.Status.ACTIVE)
        params = request.query_params
        if params.get("category"):
            qs = qs.filter(category_id=params["category"])
        if params.get("document_type"):
            qs = qs.filter(category__document_type=params["document_type"])
        if params.get("date_from"):
            qs = qs.filter(creado_en__date__gte=params["date_from"])
        if params.get("date_to"):
            qs = qs.filter(creado_en__date__lte=params["date_to"])
        if params.get("search"):
            qs = qs.filter(Q(title__icontains=params["search"]) | Q(description__icontains=params["search"]) | Q(original_filename__icontains=params["search"]))
        return qs

    def get(self, request, document_id=None):
        qs = self.get_queryset(request)
        if document_id:
            document = qs.filter(id=document_id).first()
            if not document:
                return Response({"detail": "Documento no encontrado."}, status=status.HTTP_404_NOT_FOUND)
            return Response(PatientPortalDocumentSerializer(document).data)
        return Response(PatientPortalDocumentSerializer(qs, many=True).data)


class PatientPortalDocumentFileView(PatientPortalDocumentsView):
    def get(self, request, document_id, mode=None):
        document = self.get_queryset(request).filter(id=document_id).first()
        if not document:
            return Response({"detail": "Documento no encontrado."}, status=status.HTTP_404_NOT_FOUND)
        if mode == "preview" and document.file_extension not in ["pdf", "jpg", "jpeg", "png", "webp"]:
            return Response({"detail": "Vista previa no disponible para este tipo de archivo."})
        return ClinicalDocumentViewSet()._file_response(request, document, inline=(mode == "preview"))
