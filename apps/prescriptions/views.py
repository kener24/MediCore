from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.permissions import get_role_name
from apps.medical_records.models import ClinicalConsultation
from apps.prescriptions.models import Diagnosis, MedicalOrder, Prescription, PrescriptionItem
from apps.prescriptions.serializers import (
    DiagnosisCreateSerializer,
    DiagnosisDetailSerializer,
    DiagnosisListSerializer,
    DiagnosisUpdateSerializer,
    MedicalOrderCreateSerializer,
    MedicalOrderDetailSerializer,
    MedicalOrderListSerializer,
    MedicalOrderUpdateSerializer,
    PrescriptionCreateSerializer,
    PrescriptionDetailSerializer,
    PrescriptionItemSerializer,
    PrescriptionListSerializer,
    PrescriptionStatsSerializer,
    PrescriptionUpdateSerializer,
)
from apps.notifications.models import Notification
from apps.notifications.services import create_notification


VIEW_ROLES = ["superadmin", "admin", "medico", "enfermera", "paciente"]


def scoped_queryset(request, queryset):
    role = get_role_name(request.user)
    if role == "superadmin" or request.user.is_superuser:
        clinic = request.query_params.get("clinic")
        return queryset.filter(clinic_id=clinic) if clinic else queryset
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
        return super().create(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        prescription = self.get_object()
        prescription.status = Prescription.Status.ANULADA
        prescription.activo = False
        prescription.void_reason = "Anulada desde DELETE."
        prescription.save(update_fields=["status", "activo", "void_reason"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["patch"])
    def issue(self, request, pk=None):
        prescription = self.get_object()
        if get_role_name(request.user) != "medico" or prescription.doctor.user_id != request.user.id:
            return Response({"detail": "No tienes permiso para emitir esta receta."}, status=status.HTTP_403_FORBIDDEN)
        try:
            prescription.issue()
        except DjangoValidationError as exc:
            return Response({"detail": exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)
        if prescription.patient.user:
            create_notification(prescription.patient.user, "Receta emitida", "Tienes una nueva receta disponible.", clinic=prescription.clinic, notification_type=Notification.Type.INFO, module=Notification.Module.PRESCRIPTIONS, priority=Notification.Priority.NORMAL, related_model="Prescription", related_object_id=prescription.id, action_url="/patient/prescriptions")
        return Response(PrescriptionDetailSerializer(prescription).data)

    @action(detail=True, methods=["patch"])
    def void(self, request, pk=None):
        prescription = self.get_object()
        prescription.status = Prescription.Status.ANULADA
        prescription.activo = False
        prescription.void_reason = request.data.get("reason", "")
        prescription.save(update_fields=["status", "activo", "void_reason"])
        return Response(PrescriptionDetailSerializer(prescription).data)

    @action(detail=True, methods=["get", "post"], url_path="items")
    def items(self, request, pk=None):
        prescription = self.get_object()
        if request.method == "GET":
            return Response(PrescriptionItemSerializer(prescription.items.filter(activo=True), many=True).data)
        if get_role_name(request.user) != "medico" or prescription.doctor.user_id != request.user.id:
            return Response({"detail": "No tienes permiso para agregar medicamentos."}, status=status.HTTP_403_FORBIDDEN)
        serializer = PrescriptionItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(prescription=prescription)
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
            item.activo = False
            item.save(update_fields=["activo"])
            return Response(status=status.HTTP_204_NO_CONTENT)
        serializer = PrescriptionItemSerializer(item, data=request.data, partial=True)
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
        response = super().create(request, *args, **kwargs)
        if response.status_code == status.HTTP_201_CREATED:
            order = MedicalOrder.objects.select_related("clinic", "patient__user").filter(id=response.data.get("id")).first()
            if order and order.patient.user:
                create_notification(order.patient.user, "Orden medica creada", "Tienes una nueva orden medica disponible.", clinic=order.clinic, notification_type=Notification.Type.INFO, module=Notification.Module.PRESCRIPTIONS, priority=Notification.Priority.NORMAL, related_model="MedicalOrder", related_object_id=order.id, action_url="/patient/medical-orders")
        return response

    def destroy(self, request, *args, **kwargs):
        order = self.get_object()
        order.status = MedicalOrder.Status.CANCELADA
        order.activo = False
        order.save(update_fields=["status", "activo"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["patch"])
    def complete(self, request, pk=None):
        order = self.get_object()
        if order.status == MedicalOrder.Status.CANCELADA:
            return Response({"detail": "No puedes completar una orden cancelada."}, status=status.HTTP_400_BAD_REQUEST)
        order.status = MedicalOrder.Status.COMPLETADA
        order.save(update_fields=["status"])
        if order.patient.user:
            create_notification(order.patient.user, "Orden medica completada", f"La orden {order.order_number} fue completada.", clinic=order.clinic, notification_type=Notification.Type.SUCCESS, module=Notification.Module.PRESCRIPTIONS, priority=Notification.Priority.NORMAL, related_model="MedicalOrder", related_object_id=order.id, action_url="/patient/medical-orders")
        return Response(MedicalOrderDetailSerializer(order).data)

    @action(detail=True, methods=["patch"])
    def cancel(self, request, pk=None):
        order = self.get_object()
        if order.status == MedicalOrder.Status.COMPLETADA:
            return Response({"detail": "No puedes cancelar una orden completada."}, status=status.HTTP_400_BAD_REQUEST)
        order.status = MedicalOrder.Status.CANCELADA
        order.activo = False
        order.save(update_fields=["status", "activo"])
        return Response(MedicalOrderDetailSerializer(order).data)

    @action(detail=False, methods=["get"], url_path="my-orders")
    def my_orders(self, request):
        if get_role_name(request.user) != "paciente":
            return Response({"detail": "Solo disponible para pacientes."}, status=status.HTTP_403_FORBIDDEN)
        return Response(MedicalOrderListSerializer(self.get_queryset(), many=True).data)
