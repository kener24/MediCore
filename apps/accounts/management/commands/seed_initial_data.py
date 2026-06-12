from django.core.management.base import BaseCommand

from apps.accounts.models import Role, User
from apps.clinics.models import Clinic


class Command(BaseCommand):
    help = "Crea roles, clínica demo y usuario superadmin inicial."

    def handle(self, *args, **options):
        role_descriptions = {
            "superadmin": "Acceso total al SaaS.",
            "admin": "Administrador de una clínica.",
            "medico": "Usuario médico.",
            "enfermera": "Usuario de enfermería.",
            "recepcionista": "Usuario de recepción.",
            "paciente": "Usuario paciente.",
        }

        roles = {}
        for nombre, descripcion in role_descriptions.items():
            role, _ = Role.objects.update_or_create(
                nombre=nombre,
                defaults={"descripcion": descripcion, "activo": True},
            )
            roles[nombre] = role

        demo_clinic, _ = Clinic.objects.update_or_create(
            correo="demo@medicore.com",
            defaults={
                "nombre": "Clínica Demo",
                "telefono": "9999-9999",
                "activo": True,
            },
        )

        user, created = User.objects.get_or_create(
            email="admin@medicore.com",
            defaults={
                "nombre_completo": "Super Administrador",
                "role": roles["superadmin"],
                "is_staff": True,
                "is_superuser": True,
                "is_active": True,
            },
        )
        if created:
            user.set_password("Admin12345*")
        else:
            user.nombre_completo = "Super Administrador"
            user.role = roles["superadmin"]
            user.clinica = None
            user.is_staff = True
            user.is_superuser = True
            user.is_active = True
        user.save()

        clinic_admin, created = User.objects.get_or_create(
            email="clinicadmin@medicore.com",
            defaults={
                "nombre_completo": "Administrador Clínica Demo",
                "role": roles["admin"],
                "clinica": demo_clinic,
                "is_staff": False,
                "is_superuser": False,
                "is_active": True,
            },
        )
        if created:
            clinic_admin.set_password("Admin12345*")
        else:
            clinic_admin.nombre_completo = "Administrador Clínica Demo"
            clinic_admin.role = roles["admin"]
            clinic_admin.clinica = demo_clinic
            clinic_admin.is_staff = False
            clinic_admin.is_superuser = False
            clinic_admin.is_active = True
        clinic_admin.save()

        receptionist, created = User.objects.get_or_create(
            email="recepcion@medicore.com",
            defaults={
                "nombre_completo": "Recepcion Clinica Demo",
                "role": roles["recepcionista"],
                "clinica": demo_clinic,
                "is_staff": False,
                "is_superuser": False,
                "is_active": True,
            },
        )
        if created:
            receptionist.set_password("Recepcion12345*")
        else:
            receptionist.nombre_completo = "Recepcion Clinica Demo"
            receptionist.role = roles["recepcionista"]
            receptionist.clinica = demo_clinic
            receptionist.is_staff = False
            receptionist.is_superuser = False
            receptionist.is_active = True
        receptionist.save()

        self.stdout.write(self.style.SUCCESS("Datos iniciales creados o actualizados correctamente."))
