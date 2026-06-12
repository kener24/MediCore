from django.contrib import admin

from apps.inventory.models import InventoryCategory, InventoryItem, InventoryLot, InventoryMovement


admin.site.register(InventoryCategory)
admin.site.register(InventoryItem)
admin.site.register(InventoryLot)
admin.site.register(InventoryMovement)
