from decimal import Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.accounts.permissions import get_role_name
from apps.billing.models import BillableService, CashMovement, CashSession, Invoice, InvoiceItem, Payment
from apps.inventory.models import InventoryItem, InventoryLot, InventoryMovement
from apps.medical_records.models import ClinicalSupplyUsage


def user_clinic(user):
    return getattr(user, "clinica", None)


class BillableServiceSerializer(serializers.ModelSerializer):
    clinic_nombre = serializers.CharField(source="clinic.nombre", read_only=True)

    class Meta:
        model = BillableService
        fields = ["id", "clinic", "clinic_nombre", "name", "description", "code", "price", "taxable", "tax_rate", "active", "creado_en", "actualizado_en"]
        extra_kwargs = {"clinic": {"required": False}, "code": {"required": False, "allow_blank": True}}
        validators = []

    def validate(self, attrs):
        request = self.context["request"]
        if get_role_name(request.user) != "superadmin":
            attrs["clinic"] = user_clinic(request.user)
        if not attrs.get("clinic") and not getattr(self.instance, "clinic", None):
            raise serializers.ValidationError({"clinic": "La clinica es obligatoria."})
        price = attrs.get("price", getattr(self.instance, "price", None))
        tax_rate = attrs.get("tax_rate", getattr(self.instance, "tax_rate", None))
        if price is not None and price < 0:
            raise serializers.ValidationError({"price": "El precio no puede ser negativo."})
        if tax_rate is not None and (tax_rate < 0 or tax_rate > 100):
            raise serializers.ValidationError({"tax_rate": "El impuesto debe estar entre 0 y 100."})
        return attrs


class InvoiceItemSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(source="service.name", read_only=True)
    inventory_item_name = serializers.CharField(source="inventory_item.name", read_only=True)
    inventory_lot_number = serializers.CharField(source="inventory_lot.lot_number", read_only=True)
    consumption = serializers.PrimaryKeyRelatedField(source="related_consumption", queryset=ClinicalSupplyUsage.objects.all(), write_only=True, required=False, allow_null=True)

    class Meta:
        model = InvoiceItem
        fields = ["id", "invoice", "item_type", "service", "service_name", "inventory_item", "inventory_item_name", "inventory_lot", "inventory_lot_number", "related_consultation", "related_consumption", "consumption", "description", "quantity", "unit_price", "discount_amount", "tax_rate", "tax_amount", "line_total", "active", "creado_en", "actualizado_en"]
        read_only_fields = ["id", "invoice", "tax_amount", "line_total", "creado_en", "actualizado_en"]
        extra_kwargs = {"description": {"required": False, "allow_blank": True}, "service": {"required": False, "allow_null": True}, "inventory_item": {"required": False, "allow_null": True}, "inventory_lot": {"required": False, "allow_null": True}, "related_consumption": {"required": False, "allow_null": True}}

    def validate(self, attrs):
        invoice = attrs.get("invoice", getattr(self.instance, "invoice", None))
        item_type = attrs.get("item_type", getattr(self.instance, "item_type", InvoiceItem.Type.MANUAL))
        service = attrs.get("service", getattr(self.instance, "service", None))
        inventory_item = attrs.get("inventory_item", getattr(self.instance, "inventory_item", None))
        inventory_lot = attrs.get("inventory_lot", getattr(self.instance, "inventory_lot", None))
        related_consumption = attrs.get("related_consumption", getattr(self.instance, "related_consumption", None))
        quantity = attrs.get("quantity", getattr(self.instance, "quantity", Decimal("1.00")))
        unit_price = attrs.get("unit_price", getattr(self.instance, "unit_price", Decimal("0.00")))
        discount = attrs.get("discount_amount", getattr(self.instance, "discount_amount", Decimal("0.00")))
        tax_rate = attrs.get("tax_rate", getattr(self.instance, "tax_rate", Decimal("0.00")))
        if item_type == InvoiceItem.Type.SERVICE and not service:
            raise serializers.ValidationError({"service": "Selecciona el servicio."})
        if item_type in [InvoiceItem.Type.INVENTORY_ITEM, InvoiceItem.Type.MEDICATION, InvoiceItem.Type.SUPPLY] and not inventory_item:
            raise serializers.ValidationError({"inventory_item": "Selecciona el producto de inventario."})
        if item_type == InvoiceItem.Type.CONSUMPTION and not related_consumption:
            raise serializers.ValidationError({"related_consumption": "Selecciona el consumo clinico."})
        if invoice and service and service.clinic_id != invoice.clinic_id:
            raise serializers.ValidationError({"service": "El servicio debe pertenecer a la misma clinica."})
        if invoice and inventory_item and inventory_item.clinic_id != invoice.clinic_id:
            raise serializers.ValidationError({"inventory_item": "El producto debe pertenecer a la misma clinica."})
        if inventory_lot and (not inventory_item or inventory_lot.item_id != inventory_item.id):
            raise serializers.ValidationError({"inventory_lot": "El lote no corresponde al producto."})
        if invoice and related_consumption:
            if related_consumption.invoiced:
                raise serializers.ValidationError({"related_consumption": "Este consumo ya fue facturado."})
            if related_consumption.patient_id != invoice.patient_id or related_consumption.clinic_id != invoice.clinic_id:
                raise serializers.ValidationError({"related_consumption": "El consumo debe pertenecer al mismo paciente y clinica."})
        if quantity <= 0:
            raise serializers.ValidationError({"quantity": "La cantidad debe ser mayor que cero."})
        if unit_price < 0:
            raise serializers.ValidationError({"unit_price": "El precio no puede ser negativo."})
        if discount < 0:
            raise serializers.ValidationError({"discount_amount": "El descuento no puede ser negativo."})
        if tax_rate < 0 or tax_rate > 100:
            raise serializers.ValidationError({"tax_rate": "El impuesto debe estar entre 0 y 100."})
        if discount > quantity * unit_price:
            raise serializers.ValidationError({"discount_amount": "El descuento no puede ser mayor al subtotal de linea."})
        return attrs


class InvoiceListSerializer(serializers.ModelSerializer):
    clinic_nombre = serializers.CharField(source="clinic.nombre", read_only=True)
    patient_nombre = serializers.CharField(source="patient.nombre_completo", read_only=True)
    patient_identidad = serializers.CharField(source="patient.identidad", read_only=True)

    class Meta:
        model = Invoice
        fields = ["id", "clinic", "clinic_nombre", "patient", "patient_nombre", "patient_identidad", "appointment", "consultation", "invoice_number", "issue_date", "due_date", "status", "subtotal", "discount_amount", "tax_amount", "total_amount", "paid_amount", "balance_due", "active", "creado_en", "actualizado_en"]


class PaymentListSerializer(serializers.ModelSerializer):
    patient_nombre = serializers.CharField(source="patient.nombre_completo", read_only=True)
    invoice_number = serializers.CharField(source="invoice.invoice_number", read_only=True)
    received_by_nombre = serializers.CharField(source="received_by.nombre_completo", read_only=True)

    class Meta:
        model = Payment
        fields = ["id", "clinic", "invoice", "invoice_number", "patient", "patient_nombre", "cash_session", "payment_number", "payment_date", "amount", "method", "reference", "notes", "status", "received_by", "received_by_nombre", "active", "creado_en", "actualizado_en"]


class InvoiceDetailSerializer(InvoiceListSerializer):
    items = InvoiceItemSerializer(many=True, read_only=True)
    payments = PaymentListSerializer(many=True, read_only=True)
    created_by_nombre = serializers.CharField(source="created_by.nombre_completo", read_only=True)

    class Meta(InvoiceListSerializer.Meta):
        fields = InvoiceListSerializer.Meta.fields + ["notes", "created_by", "created_by_nombre", "cancelled_by", "cancelled_at", "cancellation_reason", "items", "payments"]


class InvoiceCreateSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True, required=False)

    class Meta:
        model = Invoice
        fields = ["id", "patient", "appointment", "consultation", "invoice_number", "issue_date", "due_date", "notes", "status", "items"]
        read_only_fields = ["id"]
        extra_kwargs = {"invoice_number": {"required": False}}

    def validate(self, attrs):
        request = self.context["request"]
        patient = attrs["patient"]
        role = get_role_name(request.user)
        if role != "superadmin" and patient.clinic_id != request.user.clinica_id:
            raise serializers.ValidationError("No puedes facturar pacientes de otra clinica.")
        issue_date = attrs.get("issue_date")
        due_date = attrs.get("due_date")
        if due_date and issue_date and due_date < issue_date:
            raise serializers.ValidationError({"due_date": "La fecha de vencimiento no puede ser menor que la fecha de emision."})
        appointment = attrs.get("appointment")
        consultation = attrs.get("consultation")
        if appointment and appointment.clinic_id != patient.clinic_id:
            raise serializers.ValidationError({"appointment": "La cita debe pertenecer a la misma clinica del paciente."})
        if consultation and consultation.clinic_id != patient.clinic_id:
            raise serializers.ValidationError({"consultation": "La consulta debe pertenecer a la misma clinica del paciente."})
        attrs["clinic"] = patient.clinic
        attrs["created_by"] = request.user
        return attrs

    def validate_items(self, value):
        if value is not None and len(value) == 0:
            raise serializers.ValidationError("Agrega al menos un item a la factura.")
        consumption_ids = [item["related_consumption"].id for item in value if item.get("related_consumption")]
        if len(consumption_ids) != len(set(consumption_ids)):
            raise serializers.ValidationError("No puedes agregar el mismo consumo mas de una vez.")
        for item in value:
            service = item.get("service")
            if service and "patient" in self.initial_data:
                patient_id = self.initial_data.get("patient")
                try:
                    patient = self.fields["patient"].queryset.get(pk=patient_id)
                except Exception:
                    patient = None
                if patient and service.clinic_id != patient.clinic_id:
                    raise serializers.ValidationError("El servicio debe pertenecer a la misma clinica del paciente.")
        return value

    @transaction.atomic
    def create(self, validated_data):
        items = validated_data.pop("items", [])
        invoice = Invoice.objects.create(**validated_data)
        for item in items:
            movement = None
            inventory_item = item.get("inventory_item")
            related_consumption = item.get("related_consumption")
            if inventory_item and not related_consumption:
                movement = InventoryMovement.objects.create(
                    clinic=invoice.clinic,
                    item=inventory_item,
                    lot=item.get("inventory_lot"),
                    movement_type=InventoryMovement.Type.SALIDA,
                    quantity=item.get("quantity", Decimal("1.00")),
                    unit_cost=inventory_item.cost_price,
                    reason="invoice_sale",
                    reference_type="invoice",
                    reference_id=str(invoice.id),
                    notes=f"Factura {invoice.invoice_number}",
                    performed_by=invoice.created_by,
                )
            invoice_item = InvoiceItem.objects.create(invoice=invoice, inventory_movement=movement, **item)
            if related_consumption:
                related_consumption.invoiced = True
                related_consumption.invoice = invoice
                related_consumption.invoice_item = invoice_item
                related_consumption.status = ClinicalSupplyUsage.Status.INVOICED
                related_consumption.save(update_fields=["invoiced", "invoice", "invoice_item", "status", "actualizado_en"])
        if not items:
            invoice.recalculate()
        invoice.refresh_from_db()
        return invoice


class InvoiceUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invoice
        fields = ["issue_date", "due_date", "notes", "status", "active"]

    def validate(self, attrs):
        if self.instance.status in [Invoice.Status.PAGADA, Invoice.Status.ANULADA]:
            raise serializers.ValidationError("No puedes editar una factura pagada o anulada.")
        issue_date = attrs.get("issue_date", self.instance.issue_date)
        due_date = attrs.get("due_date", self.instance.due_date)
        if due_date and issue_date and due_date < issue_date:
            raise serializers.ValidationError({"due_date": "La fecha de vencimiento no puede ser menor que la fecha de emision."})
        return attrs


class PaymentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ["id", "invoice", "cash_session", "payment_number", "payment_date", "amount", "method", "reference", "notes"]
        read_only_fields = ["id"]
        extra_kwargs = {"payment_number": {"required": False}}

    def validate(self, attrs):
        request = self.context["request"]
        invoice = attrs["invoice"]
        if get_role_name(request.user) != "superadmin" and invoice.clinic_id != request.user.clinica_id:
            raise serializers.ValidationError("No tienes permiso sobre esta factura.")
        if invoice.status == Invoice.Status.ANULADA:
            raise serializers.ValidationError({"invoice": "No se puede pagar una factura anulada."})
        if invoice.status == Invoice.Status.PAGADA or invoice.balance_due <= 0:
            raise serializers.ValidationError({"invoice": "La factura ya esta pagada."})
        cash_session = attrs.get("cash_session")
        if cash_session:
            if cash_session.clinic_id != invoice.clinic_id:
                raise serializers.ValidationError({"cash_session": "La caja debe pertenecer a la misma clinica."})
            if cash_session.status != CashSession.Status.ABIERTA:
                raise serializers.ValidationError({"cash_session": "La caja seleccionada esta cerrada."})
        amount = attrs.get("amount")
        if amount is None or amount <= 0:
            raise serializers.ValidationError({"amount": "El monto debe ser mayor que cero."})
        if amount > invoice.balance_due:
            raise serializers.ValidationError({"amount": "El pago no puede ser mayor al saldo pendiente."})
        attrs["clinic"] = invoice.clinic
        attrs["patient"] = invoice.patient
        attrs["received_by"] = request.user
        return attrs


class AddConsumptionToInvoiceSerializer(serializers.Serializer):
    consumption_id = serializers.PrimaryKeyRelatedField(queryset=ClinicalSupplyUsage.objects.select_related("clinic", "patient", "inventory_item", "inventory_lot"), source="consumption")

    def validate_consumption_id(self, value):
        if value.invoiced or value.invoice_item_id:
            raise serializers.ValidationError("Este consumo ya fue facturado.")
        if not value.billable:
            raise serializers.ValidationError("Este consumo no esta marcado como facturable.")
        if value.status == ClinicalSupplyUsage.Status.CANCELLED:
            raise serializers.ValidationError("No se puede facturar un consumo cancelado.")
        return value


class AddInventoryItemToInvoiceSerializer(serializers.Serializer):
    inventory_item = serializers.PrimaryKeyRelatedField(queryset=InventoryItem.objects.filter(active=True))
    inventory_lot = serializers.PrimaryKeyRelatedField(queryset=InventoryLot.objects.filter(active=True), required=False, allow_null=True)
    quantity = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0.01"))
    description = serializers.CharField(required=False, allow_blank=True)
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0.00"), required=False)
    item_type = serializers.ChoiceField(choices=[InvoiceItem.Type.INVENTORY_ITEM, InvoiceItem.Type.MEDICATION, InvoiceItem.Type.SUPPLY], required=False, default=InvoiceItem.Type.INVENTORY_ITEM)

    def validate(self, attrs):
        invoice = self.context["invoice"]
        item = attrs["inventory_item"]
        lot = attrs.get("inventory_lot")
        quantity = attrs["quantity"]
        if item.clinic_id != invoice.clinic_id:
            raise serializers.ValidationError({"inventory_item": "El producto debe pertenecer a la misma clinica."})
        if item.requires_lot and not lot:
            raise serializers.ValidationError({"inventory_lot": "Este producto requiere lote."})
        if lot:
            if lot.item_id != item.id or lot.clinic_id != item.clinic_id:
                raise serializers.ValidationError({"inventory_lot": "El lote no corresponde al producto."})
            if lot.expiration_date and lot.expiration_date < timezone.localdate():
                raise serializers.ValidationError({"inventory_lot": "No se puede facturar un lote vencido."})
            if lot.quantity_current < quantity:
                raise serializers.ValidationError({"quantity": "El lote no tiene stock suficiente."})
        if item.stock_current < quantity:
            raise serializers.ValidationError({"quantity": "No hay stock suficiente."})
        return attrs


class PaymentDetailSerializer(PaymentListSerializer):
    cancelled_by_nombre = serializers.CharField(source="cancelled_by.nombre_completo", read_only=True)

    class Meta(PaymentListSerializer.Meta):
        fields = PaymentListSerializer.Meta.fields + ["cancelled_by", "cancelled_by_nombre", "cancelled_at", "cancellation_reason"]


class PaymentVoidSerializer(serializers.Serializer):
    reason = serializers.CharField(required=True, allow_blank=False)


class CashMovementSerializer(serializers.ModelSerializer):
    created_by_nombre = serializers.CharField(source="created_by.nombre_completo", read_only=True)

    class Meta:
        model = CashMovement
        fields = ["id", "clinic", "cash_session", "movement_type", "amount", "reason", "notes", "created_by", "created_by_nombre", "active", "creado_en", "actualizado_en"]
        read_only_fields = ["id", "clinic", "cash_session", "created_by", "creado_en", "actualizado_en"]

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("El monto debe ser mayor que cero.")
        return value


class CashSessionListSerializer(serializers.ModelSerializer):
    opened_by_nombre = serializers.CharField(source="opened_by.nombre_completo", read_only=True)

    class Meta:
        model = CashSession
        fields = ["id", "clinic", "opened_by", "opened_by_nombre", "opening_datetime", "closing_datetime", "opening_amount", "closing_amount", "expected_amount", "difference_amount", "status", "notes", "active", "creado_en", "actualizado_en"]


class CashSessionDetailSerializer(CashSessionListSerializer):
    movements = CashMovementSerializer(many=True, read_only=True)

    class Meta(CashSessionListSerializer.Meta):
        fields = CashSessionListSerializer.Meta.fields + ["closed_by", "movements"]


class CashSessionOpenSerializer(serializers.Serializer):
    opening_amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0.00"))
    notes = serializers.CharField(required=False, allow_blank=True)


class CashSessionCloseSerializer(serializers.Serializer):
    closing_amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0.00"))
    notes = serializers.CharField(required=False, allow_blank=True)


class BillingStatsSerializer(serializers.Serializer):
    total_invoiced = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_paid = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_pending = serializers.DecimalField(max_digits=14, decimal_places=2)
    pending_invoices = serializers.IntegerField()
    paid_invoices = serializers.IntegerField()
    partial_invoices = serializers.IntegerField()
    voided_invoices = serializers.IntegerField()
    today_payments = serializers.DecimalField(max_digits=14, decimal_places=2)
    cash_today = serializers.DecimalField(max_digits=14, decimal_places=2)
    card_today = serializers.DecimalField(max_digits=14, decimal_places=2)
    transfer_today = serializers.DecimalField(max_digits=14, decimal_places=2)
