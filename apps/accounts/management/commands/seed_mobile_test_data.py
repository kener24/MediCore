from datetime import datetime, time, timedelta
from decimal import Decimal

from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import Role, User
from apps.admissions.models import PatientVisit
from apps.appointments.models import Appointment
from apps.clinics.models import Clinic
from apps.doctors.models import DoctorProfile, DoctorSchedule, MedicalSpecialty
from apps.hospitalization.models import (
    HospitalBed,
    HospitalBedAssignment,
    HospitalRoom,
    HospitalVitalSigns,
    Hospitalization,
    MedicationAdministration,
    NursingNote,
    NursingRound,
)
from apps.medical_records.models import MedicalRecord, VitalSigns
from apps.notifications.models import Notification
from apps.patients.models import Patient


PASSWORDS = {
    "admin@medicore.com": "Admin12345*",
    "paciente@medicore.com": "Paciente12345*",
    "enfermera@medicore.com": "Enfermera12345*",
    "doctor@medicore.com": "Doctor12345*",
    "recepcion@medicore.com": "Recepcion12345*",
}


class Command(BaseCommand):
    help = "Crea usuarios y datos funcionales para probar las apps moviles de MediCore."

    def add_arguments(self, parser):
        parser.add_argument(
            "--with-legacy-demo-usage",
            action="store_true",
            help="Ejecuta el seed demo antiguo. No recomendado si ya hay facturas fiscales emitidas.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        call_command("seed_initial_data", verbosity=0)
        call_command("seed_patients", verbosity=0)
        if options["with_legacy_demo_usage"]:
            call_command("seed_demo_usage", months=5, patients_per_clinic=12, doctors_per_clinic=4, verbosity=0)

        clinic = self.ensure_clinic()
        roles = self.ensure_roles()
        users = self.ensure_users(clinic, roles)
        specialty = self.ensure_specialty()
        self.ensure_demo_clinic_usage(roles, specialty)
        doctor = self.ensure_doctor(clinic, users["doctor"], specialty)
        patients = self.ensure_patients(clinic, users["patient"])
        self.ensure_schedule(doctor)
        self.ensure_appointments(clinic, users["reception"], doctor, patients)
        self.ensure_triage_work(clinic, users, doctor, patients)
        self.ensure_hospitalization(clinic, users, doctor, patients[-1])
        self.ensure_notifications(clinic, users)

        self.stdout.write(self.style.SUCCESS("Datos moviles de prueba listos."))
        for email, password in PASSWORDS.items():
            self.stdout.write(f"{email} / {password}")

    def ensure_roles(self):
        descriptions = {
            "superadmin": "Acceso total al SaaS.",
            "admin": "Administrador de clinica.",
            "medico": "Usuario medico.",
            "enfermera": "Usuario de enfermeria.",
            "recepcionista": "Usuario de recepcion.",
            "paciente": "Usuario paciente.",
        }
        roles = {}
        for name, description in descriptions.items():
            roles[name], _ = Role.objects.update_or_create(
                nombre=name,
                defaults={"descripcion": description, "activo": True},
            )
        return roles

    def ensure_clinic(self):
        clinic, _ = Clinic.objects.update_or_create(
            correo="demo@medicore.com",
            defaults={
                "nombre": "Clinica Demo",
                "telefono": "9999-9999",
                "direccion": "Barrio Medico, San Pedro Sula",
                "rtn": "08011999123456",
                "activo": True,
            },
        )
        return clinic

    def ensure_users(self, clinic, roles):
        payloads = {
            "admin": ("admin@medicore.com", "Super Administrador", roles["superadmin"], None, True, True),
            "patient": ("paciente@medicore.com", "Paciente Demo", roles["paciente"], clinic, False, False),
            "nurse": ("enfermera@medicore.com", "Enfermera Demo", roles["enfermera"], clinic, False, False),
            "doctor": ("doctor@medicore.com", "Dr. Juan Perez", roles["medico"], clinic, False, False),
            "reception": ("recepcion@medicore.com", "Recepcion Clinica Demo", roles["recepcionista"], clinic, False, False),
        }
        users = {}
        for key, (email, name, role, user_clinic, is_staff, is_superuser) in payloads.items():
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "nombre_completo": name,
                    "role": role,
                    "clinica": user_clinic,
                    "is_staff": is_staff,
                    "is_superuser": is_superuser,
                    "is_active": True,
                    "email_verified": True,
                },
            )
            user.nombre_completo = name
            user.role = role
            user.clinica = user_clinic
            user.is_staff = is_staff
            user.is_superuser = is_superuser
            user.is_active = True
            user.email_verified = True
            user.set_password(PASSWORDS[email])
            user.save()
            users[key] = user
        return users

    def ensure_specialty(self):
        specialty, _ = MedicalSpecialty.objects.update_or_create(
            nombre="Medicina General",
            defaults={"descripcion": "Atencion medica general.", "activo": True},
        )
        return specialty

    def ensure_demo_clinic_usage(self, roles, specialty):
        payloads = [
            ("demo@medicore.com", "Clinica Demo", "9999-9999", "Barrio Medico, San Pedro Sula", "08011999123456"),
            ("norte@demo.medicore.com", "Clinica Integral del Norte", "2440-3303", "Avenida Circunvalacion, La Ceiba", "05011999345678"),
            ("sur@demo.medicore.com", "Centro Medico Sur", "2234-2202", "Colonia Palmira, Tegucigalpa", "08011999234567"),
        ]
        for index, (email, name, phone, address, rtn) in enumerate(payloads, start=1):
            clinic, _ = Clinic.objects.update_or_create(
                correo=email,
                defaults={"nombre": name, "telefono": phone, "direccion": address, "rtn": rtn, "activo": True},
            )
            reception = self.demo_user(f"recepcion.demo{index}@medicore.com", f"Recepcion {name}", roles["recepcionista"], clinic)
            nurse = self.demo_user(f"enfermera.demo{index}@medicore.com", f"Enfermera {name}", roles["enfermera"], clinic)
            doctor_user = self.demo_user(f"doctor.demo{index}@medicore.com", f"Doctor {name}", roles["medico"], clinic)
            doctor = self.ensure_demo_doctor(clinic, doctor_user, specialty, index)
            self.ensure_schedule(doctor)
            patients = self.ensure_demo_patients(clinic, roles["paciente"], index)
            self.ensure_demo_appointments(clinic, reception, doctor, patients)
            self.ensure_demo_visits(clinic, reception, nurse, doctor, patients)

    def demo_user(self, email, name, role, clinic):
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "nombre_completo": name,
                "role": role,
                "clinica": clinic,
                "is_active": True,
                "email_verified": True,
            },
        )
        user.nombre_completo = name
        user.role = role
        user.clinica = clinic
        user.is_active = True
        user.email_verified = True
        user.is_staff = False
        user.is_superuser = False
        if created or not user.has_usable_password():
            user.set_password("Demo12345*")
        user.save()
        return user

    def ensure_demo_doctor(self, clinic, user, specialty, index):
        doctor, _ = DoctorProfile.objects.update_or_create(
            user=user,
            defaults={
                "clinic": clinic,
                "specialty": specialty,
                "numero_colegiacion": f"CMH-DEMO-{index:03d}",
                "titulo_profesional": "Doctor en Medicina General",
                "tarifa_consulta": Decimal("650.00"),
                "duracion_consulta_minutos": 30,
                "atiende_presencial": True,
                "atiende_virtual": index % 2 == 0,
                "activo": True,
            },
        )
        return doctor

    def ensure_demo_patients(self, clinic, patient_role, clinic_index):
        names = [
            ("Luis Alberto", "Lopez"),
            ("Gabriela", "Castro"),
            ("Jorge", "Rivera"),
            ("Paola", "Santos"),
            ("Hector", "Reyes"),
            ("Claudia", "Cruz"),
        ]
        patients = []
        for index, (first_name, last_name) in enumerate(names, start=1):
            user = self.demo_user(f"paciente.demo{clinic_index}.{index}@medicore.com", f"{first_name} {last_name}", patient_role, clinic) if index <= 2 else None
            identity = f"0801{clinic_index:02d}{index:08d}"
            patient = Patient.objects.filter(clinic=clinic, identidad=identity).first()
            defaults = {
                "user": user,
                "nombres": first_name,
                "apellidos": last_name,
                "identidad": identity,
                "fecha_nacimiento": timezone.localdate().replace(year=1985 + index),
                "genero": Patient.Gender.FEMENINO if index in [2, 4, 6] else Patient.Gender.MASCULINO,
                "tipo_sangre": [Patient.BloodType.O_POS, Patient.BloodType.A_POS, Patient.BloodType.B_POS, Patient.BloodType.DESCONOCIDO][index % 4],
                "telefono": f"98{clinic_index}{index:05d}",
                "correo": user.email if user else f"paciente.demo{clinic_index}.{index}@medicore.com",
                "direccion": f"Residencial Demo {clinic_index}-{index}",
                "ciudad": "San Pedro Sula",
                "departamento": "Cortes",
                "observaciones": "Paciente demo de uso historico.",
                "activo": True,
            }
            if patient:
                for field, value in defaults.items():
                    setattr(patient, field, value)
                patient.save()
            else:
                patient, _ = Patient.objects.update_or_create(clinic=clinic, codigo_paciente=f"PAC-DEMO-{clinic_index}-{index:03d}", defaults=defaults)
            MedicalRecord.objects.get_or_create(patient=patient, defaults={"clinic": clinic})
            patients.append(patient)
        return patients

    def ensure_demo_appointments(self, clinic, reception, doctor, patients):
        today = timezone.localdate()
        for month in range(5):
            base = today - timedelta(days=month * 30)
            for index, patient in enumerate(patients[:4]):
                scheduled = base - timedelta(days=index)
                while scheduled.weekday() > 4:
                    scheduled -= timedelta(days=1)
                start_dt = datetime.combine(scheduled, time(9 + index, 0))
                Appointment.objects.update_or_create(
                    doctor=doctor,
                    patient=patient,
                    scheduled_date=scheduled,
                    start_time=start_dt.time(),
                    defaults={
                        "clinic": clinic,
                        "created_by": reception,
                        "end_time": (start_dt + timedelta(minutes=30)).time(),
                        "modality": Appointment.Modality.PRESENCIAL,
                        "reason": ["Consulta general", "Control medico", "Seguimiento", "Dolor agudo"][index],
                        "notes": "Cita historica demo.",
                        "status": Appointment.Status.ATENDIDA if scheduled < today else Appointment.Status.CONFIRMADA,
                        "activo": True,
                        "confirmed_at": timezone.now(),
                        "attended_at": timezone.now() if scheduled < today else None,
                    },
                )

    def ensure_demo_visits(self, clinic, reception, nurse, doctor, patients):
        today = timezone.localdate()
        for index, patient in enumerate(patients[:3]):
            record = MedicalRecord.objects.get(patient=patient)
            PatientVisit.objects.update_or_create(
                clinic=clinic,
                patient=patient,
                visit_date=today,
                reason=["Control de signos", "Triage pendiente", "Paciente listo para doctor"][index],
                defaults={
                    "medical_record": record,
                    "arrival_time": timezone.now() - timedelta(minutes=40 - index * 8),
                    "visit_type": PatientVisit.VisitType.WALK_IN,
                    "origin": PatientVisit.Origin.RECEPTION,
                    "priority": PatientVisit.Priority.URGENT if index == 1 else PatientVisit.Priority.NORMAL,
                    "status": [PatientVisit.Status.IN_TRIAGE, PatientVisit.Status.WAITING_TRIAGE, PatientVisit.Status.WAITING_DOCTOR][index],
                    "symptoms": "Dato demo para flujo operativo movil.",
                    "assigned_doctor": doctor,
                    "assigned_nurse": nurse,
                    "created_by": reception,
                    "checked_in_by": reception,
                    "active": True,
                },
            )

    def ensure_doctor(self, clinic, user, specialty):
        doctor, _ = DoctorProfile.objects.update_or_create(
            user=user,
            defaults={
                "clinic": clinic,
                "specialty": specialty,
                "numero_colegiacion": "CMH-12345",
                "titulo_profesional": "Doctor en Medicina General",
                "biografia": "Perfil funcional para pruebas moviles.",
                "tarifa_consulta": Decimal("500.00"),
                "duracion_consulta_minutos": 30,
                "atiende_presencial": True,
                "atiende_virtual": True,
                "activo": True,
            },
        )
        return doctor

    def ensure_schedule(self, doctor):
        for day in ["lunes", "martes", "miercoles", "jueves", "viernes"]:
            schedule = DoctorSchedule.objects.filter(doctor=doctor, dia_semana=day).order_by("hora_inicio").first()
            if schedule:
                schedule.hora_inicio = time(8, 0)
                schedule.hora_fin = time(17, 0)
                schedule.activo = True
                schedule.save()
            else:
                DoctorSchedule.objects.create(doctor=doctor, dia_semana=day, hora_inicio=time(8, 0), hora_fin=time(17, 0), activo=True)

    def ensure_patients(self, clinic, patient_user):
        rows = [
            ("PAC-MOV-001", "Kener Yafet", "Perez", "0801199001234", patient_user),
            ("PAC-MOV-002", "Maria Fernanda", "Gomez Rivera", "0801199505678", None),
            ("PAC-MOV-003", "Ana Lucia", "Martinez Soto", "0801200003333", None),
            ("PAC-MOV-004", "Carlos Eduardo", "Mejia Flores", "0801198807777", None),
            ("PAC-MOV-005", "Daniela Sofia", "Rivera Castro", "0801199308888", None),
        ]
        patients = []
        for index, (code, names, last_names, identity, user) in enumerate(rows, start=1):
            defaults = {
                "user": user,
                "nombres": names,
                "apellidos": last_names,
                "identidad": identity,
                "fecha_nacimiento": timezone.localdate().replace(year=1990 + index),
                "genero": Patient.Gender.FEMENINO if index in [2, 3, 5] else Patient.Gender.MASCULINO,
                "tipo_sangre": [Patient.BloodType.O_POS, Patient.BloodType.A_POS, Patient.BloodType.B_POS, Patient.BloodType.DESCONOCIDO][index % 4],
                "telefono": f"9999-44{index:02d}",
                "correo": user.email if user else f"paciente.demo{index}@medicore.com",
                "direccion": f"Residencial Demo casa {index}",
                "ciudad": "San Pedro Sula",
                "departamento": "Cortes",
                "alergias": "Penicilina" if index == 3 else "",
                "enfermedades_cronicas": "Hipertension arterial" if index == 4 else "",
                "observaciones": "Paciente demo para pruebas moviles.",
                "activo": True,
            }
            patient = Patient.objects.filter(user=user).first() if user else None
            if not patient:
                patient = Patient.objects.filter(clinic=clinic, identidad=identity).first()
            if patient:
                patient.clinic = clinic
                patient.codigo_paciente = patient.codigo_paciente or code
                for field, value in defaults.items():
                    setattr(patient, field, value)
                patient.save()
            else:
                patient, _ = Patient.objects.update_or_create(clinic=clinic, codigo_paciente=code, defaults=defaults)
            MedicalRecord.objects.get_or_create(patient=patient, defaults={"clinic": clinic})
            patients.append(patient)
        return patients

    def ensure_appointments(self, clinic, receptionist, doctor, patients):
        today = timezone.localdate()
        for index, patient in enumerate(patients[:4]):
            start_dt = datetime.combine(today, time(8 + index, 0))
            Appointment.objects.update_or_create(
                doctor=doctor,
                patient=patient,
                scheduled_date=today,
                start_time=start_dt.time(),
                defaults={
                    "clinic": clinic,
                    "created_by": receptionist,
                    "end_time": (start_dt + timedelta(minutes=30)).time(),
                    "modality": Appointment.Modality.PRESENCIAL,
                    "reason": ["Control general", "Dolor abdominal", "Toma de signos", "Seguimiento"][index],
                    "notes": "Cita demo para app movil.",
                    "status": Appointment.Status.CONFIRMADA if index < 3 else Appointment.Status.PENDIENTE,
                    "activo": True,
                    "confirmed_at": timezone.now() if index < 3 else None,
                },
            )

    def ensure_triage_work(self, clinic, users, doctor, patients):
        today = timezone.localdate()
        statuses = [
            PatientVisit.Status.WAITING_TRIAGE,
            PatientVisit.Status.IN_TRIAGE,
            PatientVisit.Status.WAITING_DOCTOR,
            PatientVisit.Status.WAITING_PAYMENT,
        ]
        priorities = [
            PatientVisit.Priority.NORMAL,
            PatientVisit.Priority.URGENT,
            PatientVisit.Priority.PRIORITY,
            PatientVisit.Priority.NORMAL,
        ]
        for index, patient in enumerate(patients[:4]):
            record = MedicalRecord.objects.get(patient=patient)
            visit, _ = PatientVisit.objects.update_or_create(
                clinic=clinic,
                patient=patient,
                visit_date=today,
                reason=["Consulta espontanea", "Dolor moderado", "Control de signos", "Alta administrativa"][index],
                defaults={
                    "medical_record": record,
                    "arrival_time": timezone.now() - timedelta(minutes=50 - index * 10),
                    "visit_type": PatientVisit.VisitType.WALK_IN,
                    "origin": PatientVisit.Origin.RECEPTION,
                    "priority": priorities[index],
                    "status": statuses[index],
                    "symptoms": "Registro funcional para validar cola de enfermeria.",
                    "assigned_doctor": doctor,
                    "assigned_nurse": users["nurse"],
                    "created_by": users["reception"],
                    "checked_in_by": users["reception"],
                    "triage_started_at": timezone.now() - timedelta(minutes=20) if statuses[index] != PatientVisit.Status.WAITING_TRIAGE else None,
                    "triage_completed_at": timezone.now() - timedelta(minutes=8) if statuses[index] in [PatientVisit.Status.WAITING_DOCTOR, PatientVisit.Status.WAITING_PAYMENT] else None,
                    "active": True,
                },
            )
            if statuses[index] in [PatientVisit.Status.IN_TRIAGE, PatientVisit.Status.WAITING_DOCTOR, PatientVisit.Status.WAITING_PAYMENT]:
                self.upsert_visit_vitals(visit, users["nurse"], index)

    def upsert_visit_vitals(self, visit, nurse, index):
        vital = VitalSigns.objects.filter(patient_visit=visit).first()
        defaults = {
            "temperature": Decimal("36.7") + Decimal(index) / Decimal("10"),
            "blood_pressure_systolic": 118 + index * 4,
            "blood_pressure_diastolic": 76 + index * 2,
            "heart_rate": 74 + index * 3,
            "respiratory_rate": 16,
            "oxygen_saturation": 98 - index,
            "weight": Decimal("70.00") + Decimal(index),
            "height": Decimal("1.70"),
            "glucose": 92 + index * 5,
            "pain_scale": index + 1,
            "notes": "Signos vitales demo para enfermeria.",
            "registrado_por": nurse,
            "recorded_at": timezone.now() - timedelta(minutes=10),
        }
        if vital:
            for field, value in defaults.items():
                setattr(vital, field, value)
            vital.save()
        else:
            VitalSigns.objects.create(patient_visit=visit, **defaults)

    def ensure_hospitalization(self, clinic, users, doctor, patient):
        room, _ = HospitalRoom.objects.update_or_create(
            clinic=clinic,
            room_number="101",
            defaults={"name": "Observacion 101", "floor": "1", "room_type": HospitalRoom.RoomType.OBSERVATION, "is_active": True},
        )
        bed, _ = HospitalBed.objects.update_or_create(
            clinic=clinic,
            bed_code="101-A",
            defaults={"room": room, "bed_number": "A", "status": HospitalBed.Status.OCCUPIED, "is_active": True},
        )
        visit = PatientVisit.objects.filter(clinic=clinic, patient=patient).first()
        hospitalization, _ = Hospitalization.objects.update_or_create(
            clinic=clinic,
            patient=patient,
            status=Hospitalization.Status.OBSERVATION,
            defaults={
                "visit": visit,
                "admission_source": Hospitalization.AdmissionSource.RECEPTION,
                "responsible_doctor": doctor,
                "admitted_by": users["reception"],
                "current_bed": bed,
                "reason": "Observacion por dolor abdominal y control de signos.",
                "diagnosis_at_admission": "Dolor abdominal en estudio.",
                "admission_datetime": timezone.now() - timedelta(hours=3),
            },
        )
        HospitalBedAssignment.objects.get_or_create(
            hospitalization=hospitalization,
            bed=bed,
            defaults={"assigned_by": users["reception"], "notes": "Asignacion demo para app de enfermeria."},
        )
        self.upsert_hospital_vitals(hospitalization, users["nurse"])
        NursingNote.objects.update_or_create(
            hospitalization=hospitalization,
            title="Ingreso y observacion",
            defaults={
                "note_type": NursingNote.NoteType.OBSERVATION,
                "note": "Paciente estable, queda en observacion y monitoreo de signos vitales.",
                "created_by": users["nurse"],
                "recorded_at": timezone.now() - timedelta(hours=2),
            },
        )
        NursingRound.objects.update_or_create(
            hospitalization=hospitalization,
            round_type=NursingRound.RoundType.ROUTINE,
            defaults={
                "clinic": clinic,
                "patient": patient,
                "nurse": users["nurse"],
                "status": NursingRound.Status.COMPLETED,
                "general_condition": "Estable",
                "pain_level": 3,
                "consciousness_status": "Alerta",
                "mobility_status": "Asistida",
                "feeding_status": "Tolerando via oral",
                "elimination_status": "Sin cambios relevantes",
                "notes": "Ronda demo registrada.",
            },
        )
        MedicationAdministration.objects.update_or_create(
            hospitalization=hospitalization,
            medication_name="Acetaminofen",
            scheduled_time=timezone.now() + timedelta(hours=1),
            defaults={
                "clinic": clinic,
                "patient": patient,
                "dosage": "500 mg",
                "route": MedicationAdministration.Route.ORAL,
                "status": MedicationAdministration.Status.PENDING,
                "notes": "Medicamento pendiente demo.",
            },
        )

    def upsert_hospital_vitals(self, hospitalization, nurse):
        vital = HospitalVitalSigns.objects.filter(hospitalization=hospitalization).first()
        defaults = {
            "temperature": Decimal("36.8"),
            "blood_pressure_systolic": 122,
            "blood_pressure_diastolic": 78,
            "heart_rate": 80,
            "respiratory_rate": 17,
            "oxygen_saturation": 98,
            "weight": Decimal("72.00"),
            "height": Decimal("1.68"),
            "glucose": 96,
            "pain_scale": 3,
            "notes": "Control hospitalario demo.",
            "recorded_by": nurse,
            "recorded_at": timezone.now() - timedelta(minutes=30),
        }
        if vital:
            for field, value in defaults.items():
                setattr(vital, field, value)
            vital.save()
        else:
            HospitalVitalSigns.objects.create(hospitalization=hospitalization, **defaults)

    def ensure_notifications(self, clinic, users):
        messages = {
            "nurse": ("Nuevo paciente en triaje", "Hay pacientes pendientes y en triaje para validar."),
            "doctor": ("Paciente listo para consulta", "Enfermeria completo signos vitales de un paciente."),
            "reception": ("Citas del dia", "Hay citas confirmadas listas para check-in."),
            "patient": ("Cita confirmada", "Tu clinica tiene datos demo disponibles para pruebas."),
        }
        for key, (title, message) in messages.items():
            Notification.objects.update_or_create(
                clinic=clinic,
                recipient=users[key],
                title=title,
                defaults={
                    "message": message,
                    "notification_type": Notification.Type.INFO,
                    "module": Notification.Module.SYSTEM,
                    "priority": Notification.Priority.NORMAL,
                    "status": Notification.Status.UNREAD,
                    "metadata": {"seed": "mobile_test_data"},
                },
            )
