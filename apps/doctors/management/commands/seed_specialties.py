from django.core.management.base import BaseCommand

from apps.accounts.models import Role, User
from apps.clinics.models import Clinic
from apps.doctors.models import DoctorProfile, DoctorSchedule
from apps.doctors.models import MedicalSpecialty


class Command(BaseCommand):
    help = "Crea especialidades medicas iniciales."

    def handle(self, *args, **options):
        specialties = [
            "Medicina General",
            "Pediatria",
            "Ginecologia",
            "Cardiologia",
            "Dermatologia",
            "Ortopedia",
            "Medicina Interna",
            "Psicologia",
            "Odontologia",
            "Nutricion",
        ]
        for name in specialties:
            MedicalSpecialty.objects.update_or_create(nombre=name, defaults={"activo": True})
        clinic = Clinic.objects.filter(correo="demo@medicore.com").first()
        medico_role = Role.objects.filter(nombre="medico").first()
        specialty = MedicalSpecialty.objects.filter(nombre="Medicina General").first()
        if clinic and medico_role and specialty:
            doctor_user, created = User.objects.get_or_create(
                email="doctor@medicore.com",
                defaults={
                    "nombre_completo": "Dr. Juan Perez",
                    "role": medico_role,
                    "clinica": clinic,
                    "is_active": True,
                },
            )
            if created:
                doctor_user.set_password("Doctor12345*")
            doctor_user.role = medico_role
            doctor_user.clinica = clinic
            doctor_user.is_active = True
            doctor_user.save()
            profile, _ = DoctorProfile.objects.update_or_create(
                user=doctor_user,
                defaults={
                    "clinic": clinic,
                    "specialty": specialty,
                    "numero_colegiacion": "CMH-12345",
                    "titulo_profesional": "Doctor en Medicina General",
                    "tarifa_consulta": "500.00",
                    "duracion_consulta_minutos": 30,
                    "atiende_presencial": True,
                    "atiende_virtual": False,
                    "activo": True,
                },
            )
            for day in ["lunes", "martes", "miercoles", "jueves", "viernes"]:
                DoctorSchedule.objects.update_or_create(
                    doctor=profile,
                    dia_semana=day,
                    hora_inicio="08:00",
                    hora_fin="12:00",
                    defaults={"activo": True},
                )
        self.stdout.write(self.style.SUCCESS("Especialidades iniciales creadas o actualizadas."))
