from django.core.exceptions import ValidationError as DjangoValidationError
from decimal import Decimal
from django.utils import timezone
from rest_framework import serializers

from apps.accounts.permissions import get_role_name
from apps.inventory.models import InventoryCategory, InventoryItem, InventoryLot, InventoryMovement


def can_manage(user):
    return get_role_name(user) in ["superadmin", "admin"]


def can_move(user):
    return get_role_name(user) in ["superadmin", "admin", "enfermera"]


class InventoryCategorySerializer(serializers.ModelSerializer):
    clinic_nombre = serializers.CharField(source="clinic.nombre", read_only=True)

    class Meta:
        model = InventoryCategory
        fields = ["id", "clinic", "clinic_nombre", "name", "description", "active", "creado_en", "actualizado_en"]
        extra_kwargs = {"clinic": {"required": False}}
        validators = []

    def validate(self, attrs):
        request = self.context["request"]
        if get_role_name(request.user) != "superadmin":
            attrs["clinic"] = request.user.clinica
        return attrs


class InventoryItemListSerializer(serializers.ModelSerializer):
    clinic_nombre = serializers.CharField(source="clinic.nombre", read_only=True)
    category_nombre = serializers.CharField(source="category.name", read_only=True)
    low_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = InventoryItem
        fields = ["id", "clinic", "clinic_nombre", "category", "category_nombre", "name", "sku", "barcode", "item_type", "unit", "presentation", "cost_price", "sale_price", "stock_current", "stock_minimum", "stock_maximum", "requires_lot", "requires_expiration", "low_stock", "active", "creado_en", "actualizado_en"]


class InventoryItemDetailSerializer(InventoryItemListSerializer):
    class Meta(InventoryItemListSerializer.Meta):
        fields = InventoryItemListSerializer.Meta.fields + ["description"]


class InventoryItemCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryItem
        fields = ["id", "clinic", "category", "name", "description", "sku", "barcode", "item_type", "unit", "presentation", "cost_price", "sale_price", "stock_minimum", "stock_maximum", "requires_lot", "requires_expiration", "active"]
        read_only_fields = ["id"]
        extra_kwargs = {"clinic": {"required": False}, "sku": {"required": False, "allow_blank": True}, "barcode": {"required": False, "allow_blank": True}}
        validators = []

    def validate(self, attrs):
        request = self.context["request"]
        clinic = attrs.get("clinic") if get_role_name(request.user) == "superadmin" else request.user.clinica
        attrs["clinic"] = clinic
        category = attrs["category"]
        if category.clinic_id and category.clinic_id != clinic.id:
            raise serializers.ValidationError("La categoria debe ser global o de la misma clinica.")
        sku = attrs.get("sku")
        barcode = attrs.get("barcode")
        if sku and InventoryItem.objects.filter(clinic=clinic, sku=sku).exists():
            raise serializers.ValidationError({"sku": "SKU ya existe en esta clinica."})
        if barcode and InventoryItem.objects.filter(clinic=clinic, barcode=barcode).exists():
            raise serializers.ValidationError({"barcode": "Codigo de barras ya existe en esta clinica."})
        return attrs


class InventoryItemUpdateSerializer(InventoryItemCreateSerializer):
    def validate(self, attrs):
        attrs = super().validate(attrs)
        clinic = self.instance.clinic
        sku = attrs.get("sku")
        barcode = attrs.get("barcode")
        if sku and InventoryItem.objects.filter(clinic=clinic, sku=sku).exclude(id=self.instance.id).exists():
            raise serializers.ValidationError({"sku": "SKU ya existe en esta clinica."})
        if barcode and InventoryItem.objects.filter(clinic=clinic, barcode=barcode).exclude(id=self.instance.id).exists():
            raise serializers.ValidationError({"barcode": "Codigo de barras ya existe en esta clinica."})
        attrs["clinic"] = clinic
        return attrs


class InventoryLotSerializer(serializers.ModelSerializer):
    item_nombre = serializers.CharField(source="item.name", read_only=True)
    expired = serializers.SerializerMethodField()
    expiring_soon = serializers.SerializerMethodField()

    class Meta:
        model = InventoryLot
        fields = ["id", "clinic", "item", "item_nombre", "lot_number", "expiration_date", "quantity_current", "cost_price", "received_date", "expired", "expiring_soon", "active", "creado_en", "actualizado_en"]
        read_only_fields = ["clinic", "quantity_current"]

    def get_expired(self, obj):
        return bool(obj.expiration_date and obj.expiration_date < timezone.localdate())

    def get_expiring_soon(self, obj):
        return bool(obj.expiration_date and timezone.localdate() <= obj.expiration_date <= timezone.localdate() + timezone.timedelta(days=30))


class InventoryMovementListSerializer(serializers.ModelSerializer):
    item_nombre = serializers.CharField(source="item.name", read_only=True)
    lot_number = serializers.CharField(source="lot.lot_number", read_only=True)
    performed_by_nombre = serializers.CharField(source="performed_by.nombre_completo", read_only=True)

    class Meta:
        model = InventoryMovement
        fields = ["id", "clinic", "item", "item_nombre", "lot", "lot_number", "movement_type", "quantity", "unit_cost", "reason", "reference_type", "reference_id", "notes", "performed_by", "performed_by_nombre", "active", "creado_en"]


class InventoryMovementDetailSerializer(InventoryMovementListSerializer):
    pass


class InventoryMovementCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryMovement
        fields = ["id", "item", "lot", "movement_type", "quantity", "unit_cost", "reason", "reference_type", "reference_id", "notes"]
        read_only_fields = ["id"]

    def validate(self, attrs):
        request = self.context["request"]
        item = attrs["item"]
        if get_role_name(request.user) != "superadmin" and item.clinic_id != request.user.clinica_id:
            raise serializers.ValidationError("No tienes permiso sobre este producto.")
        attrs["clinic"] = item.clinic
        attrs["performed_by"] = request.user
        return attrs


class StockInSerializer(serializers.Serializer):
    quantity = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0.01"))
    unit_cost = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0.00"), required=False, default=0)
    lot_number = serializers.CharField(required=False, allow_blank=True)
    expiration_date = serializers.DateField(required=False, allow_null=True)
    reason = serializers.CharField()
    notes = serializers.CharField(required=False, allow_blank=True)


class StockOutSerializer(serializers.Serializer):
    quantity = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0.01"))
    lot = serializers.IntegerField(required=False)
    reason = serializers.CharField()
    notes = serializers.CharField(required=False, allow_blank=True)


class StockAdjustmentSerializer(StockOutSerializer):
    movement_type = serializers.ChoiceField(choices=[InventoryMovement.Type.AJUSTE_POSITIVO, InventoryMovement.Type.AJUSTE_NEGATIVO])


class InventoryStatsSerializer(serializers.Serializer):
    total_items = serializers.IntegerField()
    active_items = serializers.IntegerField()
    low_stock_items = serializers.IntegerField()
    expired_lots = serializers.IntegerField()
    expiring_soon_lots = serializers.IntegerField()
    total_stock_value = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_movements_today = serializers.IntegerField()
    medicines_count = serializers.IntegerField()
    supplies_count = serializers.IntegerField()
