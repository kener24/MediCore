from decimal import Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Sum
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.accounts.permissions import get_role_name
from apps.inventory.models import InventoryItem
from apps.purchases.models import PurchaseOrder, PurchaseOrderItem, PurchaseReceipt, PurchaseReceiptItem, Supplier


def user_clinic(user):
    return getattr(user, "clinica", None)


def can_view_purchases(user):
    return get_role_name(user) in ["superadmin", "admin", "recepcionista", "enfermera"]


def can_manage_purchases(user):
    return get_role_name(user) in ["superadmin", "admin"]


def can_approve_purchase_orders(user):
    return get_role_name(user) in ["superadmin", "admin"]


def can_receive_purchase_orders(user):
    return get_role_name(user) in ["superadmin", "admin", "enfermera"]


def clinic_for_request(request, attrs=None, fallback=None):
    attrs = attrs or {}
    role = get_role_name(request.user)
    if role == "superadmin" and attrs.get("clinic"):
        return attrs["clinic"]
    return fallback or user_clinic(request.user)


class SupplierSerializer(serializers.ModelSerializer):
    clinic_nombre = serializers.CharField(source="clinic.nombre", read_only=True)

    class Meta:
        model = Supplier
        fields = ["id", "clinic", "clinic_nombre", "name", "rtn", "contact_name", "phone", "email", "address", "city", "country", "notes", "active", "creado_en", "actualizado_en"]
        extra_kwargs = {"clinic": {"required": False}}
        validators = []

    def validate(self, attrs):
        request = self.context["request"]
        clinic = clinic_for_request(request, attrs, getattr(self.instance, "clinic", None))
        if not clinic:
            raise serializers.ValidationError("No hay clinica asignada.")
        attrs["clinic"] = clinic
        rtn = attrs.get("rtn", getattr(self.instance, "rtn", ""))
        if rtn and Supplier.objects.filter(clinic=clinic, rtn=rtn).exclude(id=getattr(self.instance, "id", None)).exists():
            raise serializers.ValidationError({"rtn": "RTN ya existe en esta clinica."})
        return attrs


class SupplierListSerializer(SupplierSerializer):
    pass


class SupplierDetailSerializer(SupplierSerializer):
    total_purchased = serializers.SerializerMethodField()
    last_purchase = serializers.SerializerMethodField()

    class Meta(SupplierSerializer.Meta):
        fields = SupplierSerializer.Meta.fields + ["total_purchased", "last_purchase"]

    def get_total_purchased(self, obj):
        return obj.purchase_orders.exclude(status=PurchaseOrder.Status.CANCELADA).aggregate(total=Sum("total_amount"))["total"] or Decimal("0.00")

    def get_last_purchase(self, obj):
        order = obj.purchase_orders.exclude(status=PurchaseOrder.Status.CANCELADA).order_by("-order_date").first()
        return order.order_date if order else None


class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    item_nombre = serializers.CharField(source="item.name", read_only=True)
    item_sku = serializers.CharField(source="item.sku", read_only=True)
    requires_lot = serializers.BooleanField(source="item.requires_lot", read_only=True)
    requires_expiration = serializers.BooleanField(source="item.requires_expiration", read_only=True)
    pending_quantity = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = PurchaseOrderItem
        fields = ["id", "purchase_order", "item", "item_nombre", "item_sku", "requires_lot", "requires_expiration", "description", "quantity_ordered", "quantity_received", "pending_quantity", "unit_cost", "discount_amount", "tax_rate", "tax_amount", "line_total", "active", "creado_en", "actualizado_en"]
        read_only_fields = ["quantity_received", "tax_amount", "line_total"]


class PurchaseOrderItemCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PurchaseOrderItem
        fields = ["id", "item", "description", "quantity_ordered", "unit_cost", "discount_amount", "tax_rate", "active"]

    def validate(self, attrs):
        order = self.context.get("purchase_order")
        if not order:
            return attrs
        item = attrs.get("item", getattr(self.instance, "item", None))
        if item.clinic_id != order.clinic_id:
            raise serializers.ValidationError("El producto debe pertenecer a la misma clinica.")
        if order.status in [PurchaseOrder.Status.CANCELADA, PurchaseOrder.Status.RECIBIDA]:
            raise serializers.ValidationError("No puedes modificar una orden cancelada o recibida.")
        return attrs

    def create(self, validated_data):
        return PurchaseOrderItem.objects.create(purchase_order=self.context["purchase_order"], **validated_data)


class PurchaseOrderItemUpdateSerializer(PurchaseOrderItemCreateSerializer):
    pass


class PurchaseReceiptItemSerializer(serializers.ModelSerializer):
    item_nombre = serializers.CharField(source="item.name", read_only=True)
    order_item_description = serializers.CharField(source="purchase_order_item.description", read_only=True)

    class Meta:
        model = PurchaseReceiptItem
        fields = ["id", "receipt", "purchase_order_item", "order_item_description", "item", "item_nombre", "lot", "quantity_received", "unit_cost", "lot_number", "expiration_date", "notes", "inventory_movement", "active", "creado_en"]


class PurchaseReceiptListSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source="purchase_order.order_number", read_only=True)
    supplier_nombre = serializers.CharField(source="purchase_order.supplier.name", read_only=True)
    received_by_nombre = serializers.CharField(source="received_by.nombre_completo", read_only=True)

    class Meta:
        model = PurchaseReceipt
        fields = ["id", "clinic", "purchase_order", "order_number", "supplier_nombre", "receipt_number", "receipt_date", "received_by", "received_by_nombre", "notes", "active", "creado_en"]


class PurchaseReceiptDetailSerializer(PurchaseReceiptListSerializer):
    items = PurchaseReceiptItemSerializer(many=True, read_only=True)

    class Meta(PurchaseReceiptListSerializer.Meta):
        fields = PurchaseReceiptListSerializer.Meta.fields + ["items"]


class PurchaseOrderListSerializer(serializers.ModelSerializer):
    supplier_nombre = serializers.CharField(source="supplier.name", read_only=True)
    created_by_nombre = serializers.CharField(source="created_by.nombre_completo", read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = ["id", "clinic", "supplier", "supplier_nombre", "order_number", "order_date", "expected_date", "status", "subtotal", "discount_amount", "tax_amount", "total_amount", "notes", "created_by", "created_by_nombre", "active", "creado_en"]


class PurchaseOrderDetailSerializer(PurchaseOrderListSerializer):
    approved_by_nombre = serializers.CharField(source="approved_by.nombre_completo", read_only=True)
    cancelled_by_nombre = serializers.CharField(source="cancelled_by.nombre_completo", read_only=True)
    items = PurchaseOrderItemSerializer(many=True, read_only=True)
    receipts = PurchaseReceiptListSerializer(many=True, read_only=True)

    class Meta(PurchaseOrderListSerializer.Meta):
        fields = PurchaseOrderListSerializer.Meta.fields + ["approved_by", "approved_by_nombre", "approved_at", "cancelled_by", "cancelled_by_nombre", "cancelled_at", "cancellation_reason", "items", "receipts"]


class PurchaseOrderCreateSerializer(serializers.ModelSerializer):
    items = PurchaseOrderItemCreateSerializer(many=True, required=False)

    class Meta:
        model = PurchaseOrder
        fields = ["id", "clinic", "supplier", "order_number", "order_date", "expected_date", "status", "notes", "items"]
        extra_kwargs = {"clinic": {"required": False}, "order_number": {"required": False, "allow_blank": True}}
        validators = []

    def validate(self, attrs):
        request = self.context["request"]
        supplier = attrs["supplier"]
        clinic = clinic_for_request(request, attrs, supplier.clinic if get_role_name(request.user) == "superadmin" else None)
        if not clinic:
            raise serializers.ValidationError("No hay clinica asignada.")
        if supplier.clinic_id != clinic.id:
            raise serializers.ValidationError("El proveedor debe pertenecer a la misma clinica.")
        attrs["clinic"] = clinic
        return attrs

    def create(self, validated_data):
        items = validated_data.pop("items", [])
        request = self.context["request"]
        with transaction.atomic():
            order = PurchaseOrder.objects.create(created_by=request.user, **validated_data)
            for item_data in items:
                if item_data["item"].clinic_id != order.clinic_id:
                    raise serializers.ValidationError("El producto debe pertenecer a la misma clinica.")
                PurchaseOrderItem.objects.create(purchase_order=order, **item_data)
            order.recalculate()
            return order


class PurchaseOrderUpdateSerializer(PurchaseOrderCreateSerializer):
    items = PurchaseOrderItemCreateSerializer(many=True, required=False)

    def validate(self, attrs):
        if self.instance.status in [PurchaseOrder.Status.CANCELADA, PurchaseOrder.Status.RECIBIDA]:
            raise serializers.ValidationError("No puedes editar una orden cancelada o recibida.")
        return super().validate(attrs)

    def update(self, instance, validated_data):
        validated_data.pop("items", None)
        return super().update(instance, validated_data)


class PurchaseOrderApproveSerializer(serializers.Serializer):
    notes = serializers.CharField(required=False, allow_blank=True)


class PurchaseOrderCancelSerializer(serializers.Serializer):
    reason = serializers.CharField()


class PurchaseReceiptCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PurchaseReceipt
        fields = ["id", "purchase_order", "receipt_date", "notes"]


class PurchaseReceiveItemSerializer(serializers.Serializer):
    purchase_order_item = serializers.IntegerField()
    quantity_received = serializers.DecimalField(max_digits=12, decimal_places=2)
    unit_cost = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    lot_number = serializers.CharField(required=False, allow_blank=True)
    expiration_date = serializers.DateField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)


class PurchaseReceiveSerializer(serializers.Serializer):
    receipt_date = serializers.DateField(required=False)
    notes = serializers.CharField(required=False, allow_blank=True)
    items = PurchaseReceiveItemSerializer(many=True)

    def validate(self, attrs):
        order = self.context["purchase_order"]
        if order.status == PurchaseOrder.Status.CANCELADA:
            raise serializers.ValidationError("No puedes recibir una orden cancelada.")
        if not attrs.get("items"):
            raise serializers.ValidationError("Debes enviar al menos un producto recibido.")
        order_items = {item.id: item for item in order.items.select_related("item").filter(active=True)}
        for item_data in attrs["items"]:
            order_item = order_items.get(item_data["purchase_order_item"])
            if not order_item:
                raise serializers.ValidationError("Item de orden invalido.")
            qty = item_data["quantity_received"]
            if qty <= 0:
                raise serializers.ValidationError("La cantidad recibida debe ser mayor que cero.")
            if qty > order_item.pending_quantity:
                raise serializers.ValidationError("No puedes recibir mas de lo pendiente.")
            inventory_item = order_item.item
            if inventory_item.requires_lot and not item_data.get("lot_number"):
                raise serializers.ValidationError("Este producto requiere lote.")
            if inventory_item.requires_expiration and not item_data.get("expiration_date"):
                raise serializers.ValidationError("Este producto requiere fecha de vencimiento.")
        return attrs

    def save(self, **kwargs):
        request = self.context["request"]
        order = self.context["purchase_order"]
        with transaction.atomic():
            receipt = PurchaseReceipt.objects.create(
                purchase_order=order,
                clinic=order.clinic,
                receipt_date=self.validated_data.get("receipt_date") or timezone.localdate(),
                notes=self.validated_data.get("notes", ""),
                received_by=request.user,
            )
            for item_data in self.validated_data["items"]:
                order_item = PurchaseOrderItem.objects.select_for_update().get(pk=item_data["purchase_order_item"])
                PurchaseReceiptItem.objects.create(
                    receipt=receipt,
                    purchase_order_item=order_item,
                    item=order_item.item,
                    quantity_received=item_data["quantity_received"],
                    unit_cost=item_data.get("unit_cost") or order_item.unit_cost,
                    lot_number=item_data.get("lot_number", ""),
                    expiration_date=item_data.get("expiration_date"),
                    notes=item_data.get("notes", ""),
                )
            return receipt


class SupplierHistorySerializer(serializers.Serializer):
    supplier = SupplierDetailSerializer()
    orders = PurchaseOrderListSerializer(many=True)
    receipts = PurchaseReceiptListSerializer(many=True)
    total_purchased = serializers.DecimalField(max_digits=14, decimal_places=2)
    last_purchase = serializers.DateField(allow_null=True)


class ItemPurchaseHistorySerializer(serializers.Serializer):
    item = serializers.DictField()
    orders = PurchaseOrderItemSerializer(many=True)
    receipts = PurchaseReceiptItemSerializer(many=True)
    quantity_purchased = serializers.DecimalField(max_digits=14, decimal_places=2)
    average_cost = serializers.DecimalField(max_digits=14, decimal_places=2)


class PurchaseStatsSerializer(serializers.Serializer):
    total_purchase_orders = serializers.IntegerField()
    draft_orders = serializers.IntegerField()
    pending_orders = serializers.IntegerField()
    approved_orders = serializers.IntegerField()
    partially_received_orders = serializers.IntegerField()
    received_orders = serializers.IntegerField()
    cancelled_orders = serializers.IntegerField()
    total_purchased_amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    purchases_this_month = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_suppliers = serializers.IntegerField()
    active_suppliers = serializers.IntegerField()
