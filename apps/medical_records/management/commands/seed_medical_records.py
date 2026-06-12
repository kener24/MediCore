from datetime import time
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.appointments.models import Appointment
from apps.doctors.models import DoctorProfile
from apps.medical_records.models import ClinicalConsultation, MedicalRecord, VitalSigns
from apps.patients.models import Patient


class Command(BaseCommand):
    help = "Crea expedientes, consultas y signos vitales demo."

    def handle(self, *args, **options):
        patients = Patient.objects.select_related("clinic").filter(clinic__correo="demo@medicore.com")
        if not patients.exists():
            patients = Patient.objects.select_related("clinic").all()
        doctor = DoctorProfile.objects.filter(user__email="doctor@medicore.com").select_related("clinic", "user").first() or DoctorProfile.objects.first()
        if not doctor:
            self.stderr.write("Falta medico demo. Ejecuta seed_specialties primero.")
            return

        created_records = 0
        for patient in patients:
            _, created = MedicalRecord.objects.get_or_create(
                patient=patient,
                defaults={
                    "clinic": patient.clinic,
                    "blood_type": patient.tipo_sangre,
                    "allergies": patient.alergias,
                    "chronic_diseases": patient.enfermedades_cronicas,
                    "general_notes": "Expediente demo generado para pruebas web y movil.",
                },
            )
            created_records += int(created)

        patient = patients.first()
        if not patient:
            self.stderr.write("Faltan pacientes demo. Ejecuta seed_patients primero.")
            return
        record = patient.medical_record
        appointment = Appointment.objects.filter(patient=patient, doctor=doctor).exclude(status=Appointment.Status.CANCELADA).first()
        consultation, _ = ClinicalConsultation.objects.update_or_create(
            patient=patient,
            doctor=doctor,
            consultation_date=timezone.localdate(),
            start_time=time(10, 0),
            defaults={
                "clinic": patient.clinic,
                "medical_record": record,
                "appointment": appointment,
                "end_time": time(10, 30),
                "chief_complaint": "Dolor de cabeza y malestar general.",
                "symptoms": "Cefalea leve, cansancio, sin fiebre.",
                "physical_exam": "Paciente estable, orientado, hidratado.",
                "clinical_assessment": "Cuadro compatible con cefalea tensional.",
                "preliminary_diagnosis": "Cefalea tensional",
                "treatment_plan": "Hidratacion, analgesico simple y reposo relativo.",
                "recommendations": "Regresar si presenta fiebre, vomitos o dolor intenso.",
                "status": ClinicalConsultation.Status.BORRADOR,
                "activo": True,
                "created_by": doctor.user,
            },
        )
        VitalSigns.objects.update_or_create(
            consultation=consultation,
            defaults={
                "temperature": Decimal("36.8"),
                "blood_pressure_systolic": 118,
                "blood_pressure_diastolic": 76,
                "heart_rate": 78,
                "respiratory_rate": 16,
                "oxygen_saturation": 98,
                "weight": Decimal("72.00"),
                "height": Decimal("1.72"),
                "glucose": 92,
                "notes": "Signos vitales demo dentro de parametros.",
                "registrado_por": doctor.user,
            },
        )
        self.stdout.write(self.style.SUCCESS(f"Expedientes demo listos. Nuevos: {created_records}."))
