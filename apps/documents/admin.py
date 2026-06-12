from django.contrib import admin

from apps.documents.models import ClinicalDocument, DocumentCategory


@admin.register(DocumentCategory)
class DocumentCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "document_type", "clinic", "active")
    list_filter = ("document_type", "active")
    search_fields = ("name", "description")


@admin.register(ClinicalDocument)
class ClinicalDocumentAdmin(admin.ModelAdmin):
    list_display = ("title", "patient", "clinic", "category", "status", "visible_to_patient", "is_sensitive", "file_size")
    list_filter = ("status", "visible_to_patient", "is_sensitive", "category")
    search_fields = ("title", "description", "original_filename", "patient__nombre_completo")
    readonly_fields = ("checksum", "file_size", "file_extension", "mime_type", "original_filename")

