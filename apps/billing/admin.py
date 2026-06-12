from django.contrib import admin

from apps.billing.models import BillableService, CashMovement, CashSession, Invoice, InvoiceItem, Payment


class InvoiceItemInline(admin.TabularInline):
    model = InvoiceItem
    extra = 0


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ("invoice_number", "patient", "clinic", "status", "total_amount", "paid_amount", "balance_due")
    inlines = [InvoiceItemInline]


admin.site.register(BillableService)
admin.site.register(Payment)
admin.site.register(CashSession)
admin.site.register(CashMovement)
