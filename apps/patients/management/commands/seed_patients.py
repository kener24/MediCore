from django.core.management.base import BaseCommand

from apps.accounts.models import Role, User
from apps.clinics.models import Clinic
from apps.patients.models import Patient


class Command(BaseCommand):
    help = "Crea pacientes de prueba para Clinica Demo."

    def handle(self, *args, **options):
        clinic = Clinic.objects.filter(correo="demo@medicore.com").first() or Clinic.objects.filter(nombre__icontains="Demo").first()
        if not clinic:
            self.stderr.write("No existe Clinica Demo. Ejecuta seed_initial_data primero.")
            return
        paciente_role = Role.objects.filter(nombre="paciente").first()
        patient_user = None
        if paciente_role:
            patient_user, created = User.objects.get_or_create(
                email="paciente@medicore.com",
                defaults={
                    "nombre_completo": "Juan Carlos Perez Lopez",
                    "role": paciente_role,
                    "clinica": clinic,
                    "is_active": True,
                },
            )
            if created:
                patient_user.set_password("Paciente12345*")
            patient_user.role = paciente_role
            patient_user.clinica = clinic
            patient_user.is_active = True
            patient_user.save()

        patients = [
            {
                "codigo_paciente": "PAC-000001",
                "nombres": "Juan Carlos",
                "apellidos": "Perez Lopez",
                "identidad": "0801199001234",
                "genero": "masculino",
                "tipo_sangre": "O+",
                "telefono": "9999-1111",
                "correo": "juan.perez@example.com",
                "user": patient_user,
            },
            {
                "codigo_paciente": "PAC-000002",
                "nombres": "Maria Fernanda",
                "apellidos": "Gomez Rivera",
                "identidad": "0801199505678",
                "genero": "femenino",
                "tipo_sangre": "A+",
                "telefono": "9999-2222",
                "correo": "maria.gomez@example.com",
            },
            {
                "codigo_paciente": "PAC-000003",
                "nombres": "Ana Lucia",
                "apellidos": "Martinez Soto",
                "identidad": "0801200003333",
                "genero": "femenino",
                "tipo_sangre": "desconocido",
                "telefono": "9999-3333",
                "correo": "ana.martinez@example.com",
            },
        ]
        for data in patients:
            user = data.pop("user", None)
            patient, _ = Patient.objects.update_or_create(
                clinic=clinic,
                identidad=data["identidad"],
                defaults={**data, "user": user, "activo": True},
            )
            patient.save()
        self.stdout.write(self.style.SUCCESS("Pacientes demo creados o actualizados."))
