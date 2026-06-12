from datetime import date, time, timedelta

from django.core.management.base import BaseCommand

from apps.appointments.models import Appointment
from apps.doctors.models import DoctorProfile
from apps.patients.models import Patient


class Command(BaseCommand):
    help = "Crea citas demo usando Clinica Demo, pacientes y medico existentes."

    def handle(self, *args, **options):
        doctor = DoctorProfile.objects.filter(user__email="doctor@medicore.com").first() or DoctorProfile.objects.first()
        patient = Patient.objects.filter(correo="juan.perez@example.com").first() or Patient.objects.first()
        if not doctor or not patient:
            self.stderr.write("Faltan medico o paciente demo. Ejecuta seed_specialties y seed_patients primero.")
            return
        today = date.today()
        monday = today + timedelta(days=(0 - today.weekday()) % 7)
        examples = [
            ("pendiente", monday, time(8, 0), time(8, 30), "Consulta general"),
            ("confirmada", monday, time(8, 30), time(9, 0), "Seguimiento"),
            ("cancelada", monday, time(9, 0), time(9, 30), "Control cancelado"),
            ("atendida", monday, time(9, 30), time(10, 0), "Consulta atendida"),
        ]
        for status, scheduled_date, start_time, end_time, reason in examples:
            appointment, _ = Appointment.objects.update_or_create(
                doctor=doctor,
                patient=patient,
                scheduled_date=scheduled_date,
                start_time=start_time,
                defaults={
                    "clinic": doctor.clinic,
                    "end_time": end_time,
                    "reason": reason,
                    "status": status,
                    "activo": status != "cancelada",
                    "cancellation_reason": "Demo" if status == "cancelada" else "",
                },
            )
            appointment.save()
        self.stdout.write(self.style.SUCCESS("Citas demo creadas o actualizadas."))
