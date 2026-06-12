from django.core.management.base import BaseCommand

from apps.medical_records.models import ClinicalConsultation
from apps.prescriptions.models import Diagnosis, MedicalOrder, Prescription


class Command(BaseCommand):
    help = "Crea diagnosticos, recetas, medicamentos y ordenes demo."

    def handle(self, *args, **options):
        consultation = ClinicalConsultation.objects.select_related("clinic", "patient", "doctor__user").first()
        if not consultation:
            self.stderr.write("Faltan consultas demo. Ejecuta seed_medical_records primero.")
            return

        diagnoses = [
            ("J00", "Gripe comun", "presuntivo", True),
            ("I10", "Hipertension arterial", "confirmado", False),
            ("G43", "Migrana", "diferencial", False),
        ]
        for code, name, diagnosis_type, is_primary in diagnoses:
            Diagnosis.objects.update_or_create(
                consultation=consultation,
                name=name,
                defaults={"code": code, "diagnosis_type": diagnosis_type, "is_primary": is_primary, "description": f"Diagnostico demo: {name}"},
            )

        prescription, _ = Prescription.objects.update_or_create(
            consultation=consultation,
            prescription_number="RX-DEMO-001",
            defaults={"general_instructions": "Tomar medicamentos segun indicacion y mantener hidratacion."},
        )
        examples = [
            ("Acetaminofen 500mg", "tableta", "500mg", "cada 8 horas", "3 dias"),
            ("Loratadina 10mg", "tableta", "10mg", "cada 24 horas", "5 dias"),
        ]
        for medication_name, presentation, dosage, frequency, duration in examples:
            prescription.items.update_or_create(
                medication_name=medication_name,
                defaults={"presentation": presentation, "dosage": dosage, "frequency": frequency, "duration": duration, "route": "oral"},
            )

        orders = [
            ("Hemograma completo", "laboratorio", "normal"),
            ("Examen general de orina", "laboratorio", "normal"),
            ("Radiografia de torax", "imagenologia", "alta"),
        ]
        for title, order_type, priority in orders:
            MedicalOrder.objects.update_or_create(
                consultation=consultation,
                title=title,
                defaults={"order_type": order_type, "priority": priority, "description": f"Orden demo: {title}"},
            )
        self.stdout.write(self.style.SUCCESS("Diagnosticos, recetas y ordenes demo creados o actualizados."))
