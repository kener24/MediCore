from django.core.management.base import BaseCommand

from apps.documents.models import DocumentCategory


CATEGORIES = [
    ("Resultado de laboratorio", DocumentCategory.Type.LAB_RESULT),
    ("Imagen medica", DocumentCategory.Type.IMAGING),
    ("Consentimiento informado", DocumentCategory.Type.CONSENT),
    ("Documento de identidad", DocumentCategory.Type.IDENTITY),
    ("Referencia medica", DocumentCategory.Type.CLINICAL),
    ("Informe externo", DocumentCategory.Type.CLINICAL),
    ("Receta adjunta", DocumentCategory.Type.PRESCRIPTION),
    ("Orden medica adjunta", DocumentCategory.Type.MEDICAL_ORDER),
    ("Factura adjunta", DocumentCategory.Type.BILLING),
    ("Otro documento", DocumentCategory.Type.OTHER),
]


class Command(BaseCommand):
    help = "Crea categorias globales iniciales para documentos clinicos."

    def handle(self, *args, **options):
        created = 0
        for name, document_type in CATEGORIES:
            _, was_created = DocumentCategory.objects.get_or_create(
                clinic=None,
                name=name,
                document_type=document_type,
                defaults={"description": name, "active": True},
            )
            created += int(was_created)
        self.stdout.write(self.style.SUCCESS(f"Categorias de documentos listas. Creadas: {created}"))
