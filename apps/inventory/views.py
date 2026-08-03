from decimal import Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import F, Q, Sum
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.permissions import get_role_name
from apps.inventory.models import InventoryCategory, InventoryItem, InventoryLot, InventoryMovement
from apps.inventory.services import register_manual_movement, request_idempotency_key
from apps.inventory.serializers import (
    InventoryCategorySerializer,
    InventoryItemCreateSerializer,
    InventoryItemDetailSerializer,
    InventoryItemListSerializer,
    InventoryItemUpdateSerializer,
    InventoryLotSerializer,
    InventoryMovementDetailSerializer,
    InventoryMovementListSerializer,
    InventoryStatsSerializer,
    StockAdjustmentSerializer,
    StockInSerializer,
    StockOutSerializer,
    can_manage,
    can_move,
)
from apps.audit.models import AuditLog
from apps.audit.services import log_audit_event


VIEW_ROLES = ["admin", "medico", "enfermera", "recepcionista"]


def scope(request, queryset):
    role = get_role_name(request.user)
    if role == "superadmin" or request.user.is_superuser:
        return queryset.none()
    if role in VIEW_ROLES and request.user.clinica_id:
        return queryset.filter(Q(clinic_id=request.user.clinica_id) | Q(clinic__isnull=True))
    return queryset.none()


class InventoryCategoryViewSet(viewsets.ModelViewSet):
    queryset = InventoryCategory.objects.select_related("clinic")
    serializer_class = InventoryCategorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = scope(self.request, super().get_queryset())
        if self.request.query_params.get("active") is not None:
            queryset = queryset.filter(active=self.request.query_params["active"].lower() in ["1", "true", "yes", "si"])
        if self.request.query_params.get("search"):
            queryset = queryset.filter(name__icontains=self.request.query_params["search"])
        return queryset

    def create(self, request, *args, **kwargs):
        if not can_manage(request.user):
            return Response({"detail": "No tienes permiso para administrar categorias."}, status=status.HTTP_403_FORBIDDEN)
        response = super().create(request, *args, **kwargs)
        if response.status_code == status.HTTP_201_CREATED:
            log_audit_event(request=request, action=AuditLog.Action.CREATE, module=AuditLog.Module.INVENTORY, model_name="InventoryCategory", object_id=response.data.get("id"), object_repr=response.data.get("name", ""), description="Categoria de inventario creada.", new_values=request.data)
        return response

    def update(self, request, *args, **kwargs):
        if not can_manage(request.user):
            return Response({"detail": "No tienes permiso para administrar categorias."}, status=status.HTTP_403_FORBIDDEN)
        category = self.get_object()
        response = super().update(request, *args, **kwargs)
        log_audit_event(request=request, clinic=category.clinic, action=AuditLog.Action.UPDATE, module=AuditLog.Module.INVENTORY, model_name="InventoryCategory", object_id=category.id, object_repr=response.data.get("name", category.name), description="Categoria de inventario actualizada.", new_values=request.data)
        return response

    def destroy(self, request, *args, **kwargs):
        if not can_manage(request.user):
            return Response({"detail": "No tienes permiso para administrar categorias."}, status=status.HTTP_403_FORBIDDEN)
        category = self.get_object()
        category.active = False
        category.save(update_fields=["active"])
        log_audit_event(request=request, clinic=category.clinic, action=AuditLog.Action.DEACTIVATE, module=AuditLog.Module.INVENTORY, model_name="InventoryCategory", object_id=category.id, object_repr=category.name, description="Categoria de inventario desactivada.")
        return Response(status=status.HTTP_204_NO_CONTENT)


class InventoryItemViewSet(viewsets.ModelViewSet):
    queryset = InventoryItem.objects.select_related("clinic", "category")
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "list":
            return InventoryItemListSerializer
        if self.action == "create":
            return InventoryItemCreateSerializer
        if self.action in ["update", "partial_update"]:
            return InventoryItemUpdateSerializer
        return InventoryItemDetailSerializer

    def get_queryset(self):
        queryset = scope(self.request, super().get_queryset())
        p = self.request.query_params
        if p.get("search"):
            s = p["search"]
            queryset = queryset.filter(Q(name__icontains=s) | Q(sku__icontains=s) | Q(barcode__icontains=s) | Q(description__icontains=s))
        if p.get("item_type") or p.get("type"):
            queryset = queryset.filter(item_type=p.get("item_type") or p.get("type"))
        if p.get("category"):
            queryset = queryset.filter(category_id=p["category"])
        if p.get("active") is not None:
            queryset = queryset.filter(active=p["active"].lower() in ["1", "true", "yes", "si"])
        if p.get("low_stock") == "true":
            queryset = queryset.filter(stock_current__lte=F("stock_minimum"))
        if p.get("available") == "true":
            queryset = queryset.filter(active=True, stock_current__gt=0)
        return queryset

    def create(self, request, *args, **kwargs):
        if not can_manage(request.user):
            return Response({"detail": "No tienes permiso para crear productos."}, status=status.HTTP_403_FORBIDDEN)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            item = serializer.save()
        except DjangoValidationError as exc:
            return Response({"detail": exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)
        log_audit_event(request=request, clinic=item.clinic, action=AuditLog.Action.CREATE, module=AuditLog.Module.INVENTORY, model_name="InventoryItem", object_id=item.id, object_repr=item.name, description="Producto de inventario creado.", new_values=request.data)
        return Response(InventoryItemDetailSerializer(item).data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        if not can_manage(request.user):
            return Response({"detail": "No tienes permiso para administrar productos."}, status=status.HTTP_403_FORBIDDEN)
        item = self.get_object()
        item.active = False
        item.save(update_fields=["active"])
        log_audit_event(request=request, clinic=item.clinic, action=AuditLog.Action.DEACTIVATE, module=AuditLog.Module.INVENTORY, model_name="InventoryItem", object_id=item.id, object_repr=item.name, description="Producto de inventario desactivado.")
        return Response(status=status.HTTP_204_NO_CONTENT)

    def update(self, request, *args, **kwargs):
        if not can_manage(request.user):
            return Response({"detail": "No tienes permiso para administrar productos."}, status=status.HTTP_403_FORBIDDEN)
        try:
            item = self.get_object()
            response = super().update(request, *args, **kwargs)
            log_audit_event(request=request, clinic=item.clinic, action=AuditLog.Action.UPDATE, module=AuditLog.Module.INVENTORY, model_name="InventoryItem", object_id=item.id, object_repr=response.data.get("name", item.name), description="Producto de inventario actualizado.", new_values=request.data)
            return response
        except DjangoValidationError as exc:
            return Response({"detail": exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["patch"])
    def activate(self, request, pk=None):
        if not can_manage(request.user):
            return Response({"detail": "No tienes permiso para administrar productos."}, status=status.HTTP_403_FORBIDDEN)
        item = self.get_object()
        item.active = True
        item.save(update_fields=["active"])
        log_audit_event(request=request, clinic=item.clinic, action=AuditLog.Action.ACTIVATE, module=AuditLog.Module.INVENTORY, model_name="InventoryItem", object_id=item.id, object_repr=item.name, description="Producto de inventario activado.")
        return Response(InventoryItemDetailSerializer(item).data)

    @action(detail=True, methods=["patch"])
    def deactivate(self, request, pk=None):
        if not can_manage(request.user):
            return Response({"detail": "No tienes permiso para administrar productos."}, status=status.HTTP_403_FORBIDDEN)
        item = self.get_object()
        item.active = False
        item.save(update_fields=["active"])
        log_audit_event(request=request, clinic=item.clinic, action=AuditLog.Action.DEACTIVATE, module=AuditLog.Module.INVENTORY, model_name="InventoryItem", object_id=item.id, object_repr=item.name, description="Producto de inventario desactivado.")
        return Response(InventoryItemDetailSerializer(item).data)

    @action(detail=True, methods=["get", "post"])
    def lots(self, request, pk=None):
        item = self.get_object()
        if request.method == "GET":
            return Response(InventoryLotSerializer(item.lots.filter(active=True), many=True).data)
        if not can_manage(request.user):
            return Response({"detail": "No tienes permiso para administrar lotes."}, status=status.HTTP_403_FORBIDDEN)
        data = {**request.data, "item": item.id}
        serializer = InventoryLotSerializer(data=data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        lot = serializer.save(item=item)
        log_audit_event(request=request, clinic=item.clinic, action=AuditLog.Action.CREATE, module=AuditLog.Module.INVENTORY, model_name="InventoryLot", object_id=lot.id, object_repr=lot.lot_number, description="Lote de inventario creado.", new_values=request.data)
        return Response(InventoryLotSerializer(lot).data, status=status.HTTP_201_CREATED)

    def _movement_response(self, request, item, payload, movement_type):
        if not can_move(request.user):
            return Response({"detail": "No tienes permiso para registrar movimientos."}, status=status.HTTP_403_FORBIDDEN)
        payload["idempotency_key"] = payload.get("idempotency_key") or request_idempotency_key(request)
        try:
            movements = register_manual_movement(item=item, user=request.user, payload=payload, movement_type=movement_type)
        except DjangoValidationError as exc:
            log_audit_event(request=request, clinic=item.clinic, action=AuditLog.Action.STOCK_ADJUSTMENT if "ajuste" in movement_type else AuditLog.Action.STOCK_OUT if movement_type == InventoryMovement.Type.SALIDA else AuditLog.Action.STOCK_IN, module=AuditLog.Module.INVENTORY, model_name="InventoryItem", object_id=item.id, object_repr=item.name, description=exc.messages[0], status=AuditLog.Status.FAILED, severity=AuditLog.Severity.WARNING, new_values=payload)
            return Response({"detail": exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)
        movement = movements[0]
        replay = bool(getattr(movement, "_idempotent_replay", False))
        data = dict(InventoryMovementDetailSerializer(movement).data)
        data["allocations"] = InventoryMovementListSerializer(movements, many=True).data
        if replay:
            return Response(data, status=status.HTTP_200_OK)
        audit_action = AuditLog.Action.STOCK_IN if movement_type == InventoryMovement.Type.ENTRADA else AuditLog.Action.STOCK_OUT if movement_type == InventoryMovement.Type.SALIDA else AuditLog.Action.STOCK_ADJUSTMENT
        log_audit_event(request=request, clinic=item.clinic, action=audit_action, module=AuditLog.Module.INVENTORY, model_name="InventoryMovement", object_id=movement.id, object_repr=item.name, description="Movimiento de inventario registrado.", new_values=payload, metadata={"movement_ids": [entry.id for entry in movements], "allocations": len(movements)})
        return Response(data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="stock-in")
    def stock_in(self, request, pk=None):
        serializer = StockInSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return self._movement_response(request, self.get_object(), serializer.validated_data, InventoryMovement.Type.ENTRADA)

    @action(detail=True, methods=["post"], url_path="stock-out")
    def stock_out(self, request, pk=None):
        serializer = StockOutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return self._movement_response(request, self.get_object(), serializer.validated_data, InventoryMovement.Type.SALIDA)

    @action(detail=True, methods=["post"], url_path="adjust-stock")
    def adjust_stock(self, request, pk=None):
        serializer = StockAdjustmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return self._movement_response(request, self.get_object(), serializer.validated_data, serializer.validated_data["movement_type"])


class InventoryLotViewSet(viewsets.ModelViewSet):
    queryset = InventoryLot.objects.select_related("clinic", "item")
    serializer_class = InventoryLotSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = scope(self.request, super().get_queryset())
        p = self.request.query_params
        if p.get("item"):
            queryset = queryset.filter(item_id=p["item"])
        if p.get("active") is not None:
            queryset = queryset.filter(active=p["active"].lower() in ["1", "true", "yes", "si"])
        today = timezone.localdate()
        if p.get("expired") == "true":
            queryset = queryset.filter(expiration_date__lt=today)
        if p.get("expiring_soon") == "true":
            queryset = queryset.filter(expiration_date__gte=today, expiration_date__lte=today + timezone.timedelta(days=30))
        return queryset

    def create(self, request, *args, **kwargs):
        if not can_manage(request.user):
            return Response({"detail": "No tienes permiso para administrar lotes."}, status=status.HTTP_403_FORBIDDEN)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            lot = serializer.save()
        except DjangoValidationError as exc:
            return Response({"detail": exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)
        log_audit_event(request=request, clinic=lot.clinic, action=AuditLog.Action.CREATE, module=AuditLog.Module.INVENTORY, model_name="InventoryLot", object_id=lot.id, object_repr=lot.lot_number, description="Lote de inventario creado.", new_values=request.data)
        return Response(InventoryLotSerializer(lot).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        if not can_manage(request.user):
            return Response({"detail": "No tienes permiso para administrar lotes."}, status=status.HTTP_403_FORBIDDEN)
        try:
            lot = self.get_object()
            response = super().update(request, *args, **kwargs)
            log_audit_event(request=request, clinic=lot.clinic, action=AuditLog.Action.UPDATE, module=AuditLog.Module.INVENTORY, model_name="InventoryLot", object_id=lot.id, object_repr=lot.lot_number, description="Lote de inventario actualizado.", new_values=request.data)
            return response
        except DjangoValidationError as exc:
            return Response({"detail": exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        if not can_manage(request.user):
            return Response({"detail": "No tienes permiso para administrar lotes."}, status=status.HTTP_403_FORBIDDEN)
        lot = self.get_object()
        if lot.quantity_current > 0:
            return Response({"detail": "No se puede desactivar un lote con existencia disponible."}, status=status.HTTP_409_CONFLICT)
        lot.active = False
        lot.save(update_fields=["active"])
        log_audit_event(request=request, clinic=lot.clinic, action=AuditLog.Action.DEACTIVATE, module=AuditLog.Module.INVENTORY, model_name="InventoryLot", object_id=lot.id, object_repr=lot.lot_number, description="Lote de inventario desactivado.")
        return Response(status=status.HTTP_204_NO_CONTENT)


class InventoryMovementViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = InventoryMovement.objects.select_related("clinic", "item", "lot", "performed_by")
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        return InventoryMovementDetailSerializer if self.action == "retrieve" else InventoryMovementListSerializer

    def get_queryset(self):
        queryset = scope(self.request, super().get_queryset())
        p = self.request.query_params
        for param, field in [("item", "item_id"), ("lot", "lot_id"), ("movement_type", "movement_type"), ("type", "movement_type"), ("reference_type", "reference_type"), ("performed_by", "performed_by_id")]:
            if p.get(param):
                queryset = queryset.filter(**{field: p[param]})
        if p.get("date_from"):
            queryset = queryset.filter(creado_en__date__gte=p["date_from"])
        if p.get("date_to"):
            queryset = queryset.filter(creado_en__date__lte=p["date_to"])
        return queryset

    def create(self, request):
        return Response(
            {"detail": "Usa las acciones stock-in, stock-out o adjust-stock del producto para registrar movimientos controlados."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )


class InventoryAlertViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def low_stock(self, request):
        return Response(InventoryItemListSerializer(scope(request, InventoryItem.objects.all()).filter(active=True, stock_current__lte=F("stock_minimum")), many=True).data)

    def expiring_soon(self, request):
        days = int(request.query_params.get("days", 30))
        today = timezone.localdate()
        lots = scope(request, InventoryLot.objects.all()).filter(active=True, quantity_current__gt=0, expiration_date__gte=today, expiration_date__lte=today + timezone.timedelta(days=days))
        return Response(InventoryLotSerializer(lots, many=True).data)

    def expired(self, request):
        lots = scope(request, InventoryLot.objects.all()).filter(active=True, quantity_current__gt=0, expiration_date__lt=timezone.localdate())
        return Response(InventoryLotSerializer(lots, many=True).data)


class InventoryStatsViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        items = scope(request, InventoryItem.objects.all())
        lots = scope(request, InventoryLot.objects.all())
        today = timezone.localdate()
        data = {
            "total_items": items.count(),
            "active_items": items.filter(active=True).count(),
            "low_stock_items": items.filter(active=True, stock_current__lte=F("stock_minimum")).count(),
            "expired_lots": lots.filter(active=True, quantity_current__gt=0, expiration_date__lt=today).count(),
            "expiring_soon_lots": lots.filter(active=True, quantity_current__gt=0, expiration_date__gte=today, expiration_date__lte=today + timezone.timedelta(days=30)).count(),
            "total_stock_value": items.aggregate(total=Sum(F("stock_current") * F("cost_price")))["total"] or Decimal("0.00"),
            "total_movements_today": scope(request, InventoryMovement.objects.all()).filter(creado_en__date=today).count(),
            "medicines_count": items.filter(item_type=InventoryItem.Type.MEDICAMENTO).count(),
            "supplies_count": items.filter(item_type=InventoryItem.Type.INSUMO).count(),
        }
        return Response(InventoryStatsSerializer(data).data)
