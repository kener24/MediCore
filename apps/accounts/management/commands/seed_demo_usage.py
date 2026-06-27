from datetime import date, datetime, time, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import Role, User
from apps.admissions.models import PatientVisit
from apps.appointments.models import Appointment
from apps.billing.fiscal_services import issue_fiscal_invoice
from apps.billing.models import (
    BillableService,
    ClinicFiscalProfile,
    FiscalDocumentRange,
    Invoice,
    InvoiceItem,
    Payment,
)
from apps.clinic_settings.models import (
    ClinicSettings,
    ClinicWorkflowSettings,
    get_or_create_clinic_settings,
    get_or_create_workflow_settings,
)
from apps.clinics.models import Clinic
from apps.doctors.models import DoctorProfile, DoctorSchedule, MedicalSpecialty
from apps.medical_records.models import ClinicalConsultation, MedicalRecord, VitalSigns
from apps.notifications.models import Notification
from apps.notifications.services import create_notification
from apps.patients.models import Patient
from apps.prescriptions.models import Diagnosis, MedicalOrder, Prescription, PrescriptionItem
from apps.subscriptions.models import ClinicSubscription, SubscriptionPlan


PASSWORD = "Demo12345*"


class Command(BaseCommand):
    help = "Nutre el sistema con datos demo multi-clinica simulando varios meses de uso."

    def add_arguments(self, parser):
        parser.add_argument("--months", type=int, default=5)
        parser.add_argument("--patients-per-clinic", type=int, default=12)
        parser.add_argument("--doctors-per-clinic", type=int, default=4)

    @transaction.atomic
    def handle(self, *args, **options):
        self.months = max(options["months"], 1)
        self.patients_per_clinic = max(options["patients_per_clinic"], 6)
        self.doctors_per_clinic = max(options["doctors_per_clinic"], 3)

        roles = self.ensure_roles()
        plan = self.ensure_plan()
        specialties = self.ensure_specialties()

        total = {"clinics": 0, "patients": 0, "doctors": 0, "appointments": 0, "consultations": 0, "invoices": 0}
        for index, payload in enumerate(self.clinic_payloads(), start=1):
            clinic, created = Clinic.objects.update_or_create(
                correo=payload["correo"],
                defaults={
                    "nombre": payload["nombre"],
                    "rtn": payload["rtn"],
                    "telefono": payload["telefono"],
                    "direccion": payload["direccion"],
                    "activo": True,
                },
            )
            total["clinics"] += 1 if created else 0
            self.configure_clinic(clinic, payload, plan, index)
            staff = self.ensure_staff(clinic, roles, index)
            doctors = self.ensure_doctors(clinic, roles, specialties, index)
            patients = self.ensure_patients(clinic, roles, index)
            self.ensure_services(clinic)
            created_counts = self.seed_activity(clinic, staff, doctors, patients, index)
            for key, value in created_counts.items():
                total[key] += value

        self.stdout.write(self.style.SUCCESS("Datos demo multi-clinica listos."))
        self.stdout.write(
            "Resumen: "
            + ", ".join(f"{key}={value}" for key, value in total.items())
        )
        self.stdout.write("Password demo para usuarios creados: Demo12345*")
        self.stdout.write("Usuarios principales: admin1@demo.medicore.com, recepcion1@demo.medicore.com, enfermera1@demo.medicore.com, doctor1.1@demo.medicore.com, paciente1.1@demo.medicore.com")

    def ensure_roles(self):
        descriptions = {
            "superadmin": "Acceso total al SaaS.",
            "admin": "Administrador de clinica.",
            "medico": "Usuario medico.",
            "enfermera": "Usuario de enfermeria.",
            "recepcionista": "Usuario de recepcion y caja.",
            "paciente": "Usuario paciente.",
        }
        roles = {}
        for nombre, desc in descriptions.items():
            role, _ = Role.objects.update_or_create(
                nombre=nombre,
                defaults={"descripcion": desc, "activo": True},
            )
            roles[nombre] = role
        return roles

    def ensure_plan(self):
        plan, _ = SubscriptionPlan.objects.update_or_create(
            code="enterprise-demo",
            defaults={
                "name": "Enterprise Demo",
                "description": "Plan demo con todas las funciones activas.",
                "price_monthly": Decimal("3499.00"),
                "price_yearly": Decimal("34990.00"),
                "max_users": 100,
                "max_doctors": 50,
                "max_patients": 5000,
                "max_appointments_per_month": 5000,
                "max_storage_mb": 20000,
                "allow_billing": True,
                "allow_inventory": True,
                "allow_purchases": True,
                "allow_reports": True,
                "allow_audit": True,
                "allow_notifications": True,
                "allow_patient_portal": True,
                "allow_mobile_api": True,
                "allow_multi_branch": True,
                "support_level": SubscriptionPlan.SupportLevel.ENTERPRISE,
                "active": True,
            },
        )
        return plan

    def ensure_specialties(self):
        names = [
            "Medicina General",
            "Pediatria",
            "Ginecologia",
            "Medicina Interna",
            "Ortopedia",
            "Dermatologia",
        ]
        return [
            MedicalSpecialty.objects.update_or_create(
                nombre=name,
                defaults={"descripcion": f"Atencion de {name.lower()}.", "activo": True},
            )[0]
            for name in names
        ]

    def clinic_payloads(self):
        return [
            {
                "nombre": "Clinica Santa Lucia",
                "correo": "contacto+santalucia@demo.medicore.com",
                "telefono": "2550-1101",
                "rtn": "08011999123456",
                "direccion": "Barrio Los Andes, San Pedro Sula, Cortes",
                "municipio": "San Pedro Sula",
                "departamento": "Cortes",
                "color": "#0F766E",
            },
            {
                "nombre": "Centro Medico Valle Verde",
                "correo": "contacto+valleverde@demo.medicore.com",
                "telefono": "2234-2202",
                "rtn": "08011999234567",
                "direccion": "Colonia Palmira, Tegucigalpa, Francisco Morazan",
                "municipio": "Tegucigalpa",
                "departamento": "Francisco Morazan",
                "color": "#2563EB",
            },
            {
                "nombre": "Clinica Integral del Norte",
                "correo": "contacto+norte@demo.medicore.com",
                "telefono": "2440-3303",
                "rtn": "05011999345678",
                "direccion": "Avenida Circunvalacion, La Ceiba, Atlantida",
                "municipio": "La Ceiba",
                "departamento": "Atlantida",
                "color": "#7C3AED",
            },
        ]

    def configure_clinic(self, clinic, payload, plan, index):
        settings = get_or_create_clinic_settings(clinic)
        settings.primary_color = payload["color"]
        settings.default_tax_rate = Decimal("15.00")
        settings.allow_online_appointments = True
        settings.allow_patient_cancellations = True
        settings.allow_patient_portal = True
        settings.allow_patient_medical_record_view = True
        settings.allow_patient_prescription_view = True
        settings.allow_patient_invoice_view = True
        settings.fiscal_name = clinic.nombre
        settings.fiscal_rtn = clinic.rtn
        settings.fiscal_address = clinic.direccion
        settings.fiscal_phone = clinic.telefono
        settings.fiscal_email = clinic.correo
        settings.footer_invoice_text = "Gracias por confiar en nuestra clinica."
        settings.terms_and_conditions = "Datos demo para pruebas funcionales de MediCore."
        settings.privacy_policy = "Informacion ficticia de pacientes para pruebas."
        settings.save()

        workflow = get_or_create_workflow_settings(clinic)
        workflow.allow_online_appointments = True
        workflow.reception_handles_cashier = True
        workflow.appointment_direct_to_doctor = False
        workflow.appointment_requires_triage = True
        workflow.auto_send_to_billing_after_consultation = True
        workflow.auto_complete_visit_after_payment = True
        workflow.save()

        ClinicSubscription.objects.update_or_create(
            clinic=clinic,
            defaults={
                "plan": plan,
                "status": ClinicSubscription.Status.ACTIVE,
                "billing_cycle": ClinicSubscription.BillingCycle.MONTHLY,
                "start_date": timezone.localdate() - timedelta(days=180),
                "end_date": timezone.localdate() + timedelta(days=365),
                "next_payment_date": timezone.localdate() + timedelta(days=30),
                "active": True,
            },
        )

        ClinicFiscalProfile.objects.update_or_create(
            clinic=clinic,
            defaults={
                "legal_name": clinic.nombre,
                "commercial_name": clinic.nombre,
                "rtn": clinic.rtn,
                "address": clinic.direccion,
                "municipality": payload["municipio"],
                "department": payload["departamento"],
                "phone": clinic.telefono,
                "email": clinic.correo,
                "economic_activity": "Servicios medicos ambulatorios",
                "is_fiscal_billing_enabled": True,
                "default_isv_rate": Decimal("15.00"),
                "secondary_isv_rate": Decimal("18.00"),
                "require_customer_rtn": False,
            },
        )
        FiscalDocumentRange.objects.update_or_create(
            clinic=clinic,
            document_type=FiscalDocumentRange.DocumentType.INVOICE,
            start_number=index * 10000 + 1,
            defaults={
                "cai": f"DEMO-CAI-{index:02d}-NO-VALIDO-LEGALMENTE",
                "establishment_code": f"{index:03d}",
                "emission_point_code": "001",
                "document_type_code": "01",
                "end_number": index * 10000 + 5000,
                "current_number": index * 10000 + 1,
                "start_date": timezone.localdate() - timedelta(days=180),
                "expiration_date": timezone.localdate() + timedelta(days=180),
                "is_active": True,
                "is_exhausted": False,
            },
        )

    def ensure_staff(self, clinic, roles, index):
        return {
            "admin": self.user(
                f"admin{index}@demo.medicore.com",
                f"Administrador {clinic.nombre}",
                roles["admin"],
                clinic,
            ),
            "reception": self.user(
                f"recepcion{index}@demo.medicore.com",
                f"Recepcion {clinic.nombre}",
                roles["recepcionista"],
                clinic,
            ),
            "nurse": self.user(
                f"enfermera{index}@demo.medicore.com",
                f"Enfermera {clinic.nombre}",
                roles["enfermera"],
                clinic,
            ),
        }

    def ensure_doctors(self, clinic, roles, specialties, clinic_index):
        names = [
            "Dra. Ana Morales",
            "Dr. Carlos Medina",
            "Dra. Sofia Aguilar",
            "Dr. Roberto Castillo",
            "Dra. Valeria Nunez",
        ]
        doctors = []
        for offset in range(self.doctors_per_clinic):
            user = self.user(
                f"doctor{clinic_index}.{offset + 1}@demo.medicore.com",
                names[(clinic_index + offset) % len(names)],
                roles["medico"],
                clinic,
            )
            doctor, _ = DoctorProfile.objects.update_or_create(
                user=user,
                defaults={
                    "clinic": clinic,
                    "specialty": specialties[(clinic_index + offset) % len(specialties)],
                    "numero_colegiacion": f"COL-DEMO-{clinic_index}{offset + 1:03d}",
                    "titulo_profesional": "Medico especialista",
                    "biografia": "Perfil demo para pruebas de agenda y consulta.",
                    "tarifa_consulta": Decimal("650.00") + Decimal(offset * 100),
                    "duracion_consulta_minutos": 30,
                    "atiende_virtual": offset % 2 == 0,
                    "atiende_presencial": True,
                    "activo": True,
                },
            )
            for day in ["lunes", "martes", "miercoles", "jueves", "viernes"]:
                DoctorSchedule.objects.update_or_create(
                    doctor=doctor,
                    dia_semana=day,
                    hora_inicio=time(8, 0),
                    hora_fin=time(16, 0),
                    defaults={"activo": True},
                )
            doctors.append(doctor)
        return doctors

    def ensure_patients(self, clinic, roles, clinic_index):
        first_names = ["Kener", "Maria", "Jose", "Andrea", "Luis", "Gabriela", "Jorge", "Daniela", "Fernando", "Paola", "Hector", "Claudia"]
        last_names = ["Perez", "Lopez", "Martinez", "Garcia", "Hernandez", "Castro", "Rivera", "Mejia", "Flores", "Santos", "Reyes", "Cruz"]
        patients = []
        for number in range(1, self.patients_per_clinic + 1):
            has_portal = number <= 3
            user = None
            if has_portal:
                user = self.user(
                    f"paciente{clinic_index}.{number}@demo.medicore.com",
                    f"{first_names[number - 1]} {last_names[(number + clinic_index) % len(last_names)]}",
                    roles["paciente"],
                    clinic,
                )
            patient, _ = Patient.objects.update_or_create(
                clinic=clinic,
                codigo_paciente=f"PAC-DEMO-{clinic_index}-{number:03d}",
                defaults={
                    "user": user,
                    "nombres": first_names[number - 1],
                    "apellidos": last_names[(number + clinic_index) % len(last_names)],
                    "identidad": f"0801{clinic_index:02d}{number:08d}",
                    "fecha_nacimiento": date(1980 + (number % 25), (number % 12) + 1, min(number + 4, 28)),
                    "genero": Patient.Gender.FEMENINO if number % 2 == 0 else Patient.Gender.MASCULINO,
                    "tipo_sangre": [Patient.BloodType.O_POS, Patient.BloodType.A_POS, Patient.BloodType.B_POS, Patient.BloodType.AB_POS][number % 4],
                    "telefono": f"9{clinic_index}{number:06d}",
                    "correo": f"paciente{clinic_index}.{number}@demo.medicore.com",
                    "direccion": f"Residencial Demo casa {number}",
                    "ciudad": "San Pedro Sula" if clinic_index == 1 else "Tegucigalpa" if clinic_index == 2 else "La Ceiba",
                    "departamento": "Cortes" if clinic_index == 1 else "Francisco Morazan" if clinic_index == 2 else "Atlantida",
                    "contacto_emergencia_nombre": "Contacto Familiar",
                    "contacto_emergencia_telefono": f"8{clinic_index}{number:06d}",
                    "contacto_emergencia_parentesco": "Familiar",
                    "alergias": "Penicilina" if number % 5 == 0 else "",
                    "enfermedades_cronicas": "Hipertension arterial" if number % 4 == 0 else "",
                    "observaciones": "Paciente demo con datos ficticios.",
                    "activo": True,
                },
            )
            MedicalRecord.objects.get_or_create(patient=patient, defaults={"clinic": clinic})
            patients.append(patient)
        return patients

    def ensure_services(self, clinic):
        services = [
            ("CONS-GEN", "Consulta medicina general", Decimal("650.00")),
            ("CONS-ESP", "Consulta especialista", Decimal("900.00")),
            ("CTRL", "Control medico", Decimal("450.00")),
            ("PROC-MEN", "Procedimiento menor", Decimal("1200.00")),
            ("LAB-BAS", "Panel laboratorio basico", Decimal("380.00")),
        ]
        for code, name, price in services:
            BillableService.objects.update_or_create(
                clinic=clinic,
                code=code,
                defaults={"name": name, "description": "Servicio demo", "price": price, "taxable": False, "tax_rate": Decimal("0.00"), "active": True},
            )

    def seed_activity(self, clinic, staff, doctors, patients, clinic_index):
        counts = {"patients": len(patients), "doctors": len(doctors), "appointments": 0, "consultations": 0, "invoices": 0}
        today = timezone.localdate()
        service_codes = ["CONS-GEN", "CONS-ESP", "CTRL", "LAB-BAS"]
        diagnoses = ["Rinofaringitis aguda", "Gastritis", "Lumbalgia", "Hipertension esencial", "Control pediatrico", "Dermatitis"]
        slot_by_key = {}

        for month_offset in range(self.months):
            base = today - timedelta(days=month_offset * 30)
            for idx, patient in enumerate(patients[: min(len(patients), 10)]):
                doctor = doctors[(idx + month_offset) % len(doctors)]
                scheduled = self.next_weekday(base - timedelta(days=idx % 12))
                slot_index = slot_by_key.get((doctor.id, scheduled), 0)
                slot_by_key[(doctor.id, scheduled)] = slot_index + 1
                start = (datetime.combine(scheduled, time(8, 0)) + timedelta(minutes=30 * slot_index)).time()
                end = (datetime.combine(scheduled, start) + timedelta(minutes=30)).time()
                status = Appointment.Status.ATENDIDA if scheduled <= today else Appointment.Status.CONFIRMADA
                appointment, created = Appointment.objects.update_or_create(
                    doctor=doctor,
                    patient=patient,
                    scheduled_date=scheduled,
                    start_time=start,
                    defaults={
                        "clinic": clinic,
                        "created_by": staff["reception"],
                        "end_time": end,
                        "modality": Appointment.Modality.ONLINE if idx % 7 == 0 else Appointment.Modality.PRESENCIAL,
                        "reason": ["Consulta general", "Seguimiento", "Dolor abdominal", "Control medico"][idx % 4],
                        "notes": "Cita demo generada para pruebas.",
                        "status": status,
                        "activo": True,
                        "confirmed_at": timezone.now() if status == Appointment.Status.CONFIRMADA else None,
                        "attended_at": timezone.now() if status == Appointment.Status.ATENDIDA else None,
                    },
                )
                if created:
                    counts["appointments"] += 1
                if status == Appointment.Status.ATENDIDA:
                    consultation = self.ensure_consultation(clinic, staff, patient, doctor, appointment, diagnoses[(idx + month_offset) % len(diagnoses)])
                    if consultation:
                        counts["consultations"] += 1
                    invoice = self.ensure_invoice(clinic, staff, patient, appointment, consultation, service_codes[(idx + month_offset) % len(service_codes)], clinic_index, month_offset, idx)
                    if invoice:
                        counts["invoices"] += 1

        self.ensure_today_work(clinic, staff, doctors, patients)
        self.ensure_notifications(clinic, patients)
        return counts

    def ensure_consultation(self, clinic, staff, patient, doctor, appointment, diagnosis_name):
        record = MedicalRecord.objects.get(patient=patient)
        consultation, created = ClinicalConsultation.objects.update_or_create(
            appointment=appointment,
            defaults={
                "clinic": clinic,
                "medical_record": record,
                "patient": patient,
                "doctor": doctor,
                "consultation_date": appointment.scheduled_date,
                "start_time": appointment.start_time,
                "end_time": appointment.end_time,
                "chief_complaint": appointment.reason,
                "symptoms": "Sintomas leves a moderados de evolucion reciente.",
                "physical_exam": "Paciente estable, signos vitales dentro de rango esperado.",
                "clinical_assessment": "Evaluacion clinica demo completada.",
                "preliminary_diagnosis": diagnosis_name,
                "treatment_plan": "Tratamiento ambulatorio y control si persisten sintomas.",
                "recommendations": "Hidratacion, reposo relativo y seguir indicaciones.",
                "status": ClinicalConsultation.Status.FINALIZADA,
                "created_by": doctor.user,
                "finalized_by": doctor.user,
                "finalized_at": timezone.now(),
                "activo": True,
            },
        )
        Diagnosis.objects.update_or_create(
            consultation=consultation,
            is_primary=True,
            defaults={
                "clinic": clinic,
                "patient": patient,
                "doctor": doctor,
                "code": "DEMO",
                "name": diagnosis_name,
                "diagnosis_type": Diagnosis.Type.CONFIRMADO,
                "activo": True,
            },
        )
        VitalSigns.objects.update_or_create(
            consultation=consultation,
            defaults={
                "temperature": Decimal("36.7"),
                "blood_pressure_systolic": 120,
                "blood_pressure_diastolic": 78,
                "heart_rate": 76,
                "respiratory_rate": 16,
                "oxygen_saturation": 98,
                "weight": Decimal("70.00"),
                "height": Decimal("1.70"),
                "pain_scale": 2,
                "registrado_por": staff["nurse"],
            },
        )
        prescription, _ = Prescription.objects.update_or_create(
            consultation=consultation,
            defaults={
                "clinic": clinic,
                "patient": patient,
                "doctor": doctor,
                "issue_date": consultation.consultation_date,
                "general_instructions": "Tomar medicamentos segun indicacion y regresar si hay alarma.",
                "status": Prescription.Status.BORRADOR,
                "activo": True,
            },
        )
        if not prescription.items.exists():
            PrescriptionItem.objects.create(
                prescription=prescription,
                medication_name="Acetaminofen",
                presentation="Tabletas 500mg",
                dosage="1 tableta",
                frequency="cada 8 horas",
                duration="3 dias",
                quantity="10 tabletas",
                instructions="Tomar despues de alimentos.",
            )
        if prescription.status != Prescription.Status.EMITIDA:
            prescription.status = Prescription.Status.EMITIDA
            prescription.issue_date = consultation.consultation_date
            prescription.save(update_fields=["status", "issue_date", "actualizado_en"])
        MedicalOrder.objects.update_or_create(
            consultation=consultation,
            title="Hemograma completo" if created else "Panel de control",
            defaults={
                "clinic": clinic,
                "patient": patient,
                "doctor": doctor,
                "order_type": MedicalOrder.Type.LABORATORIO,
                "description": "Orden demo para seguimiento clinico.",
                "instructions": "Presentarse en ayunas si aplica.",
                "priority": MedicalOrder.Priority.NORMAL,
                "status": MedicalOrder.Status.COMPLETADA if consultation.consultation_date < timezone.localdate() - timedelta(days=7) else MedicalOrder.Status.PENDIENTE,
                "activo": True,
            },
        )
        return consultation

    def ensure_invoice(self, clinic, staff, patient, appointment, consultation, service_code, clinic_index, month_offset, idx):
        invoice_number = f"FAC-DEMO-{clinic_index}-{month_offset + 1:02d}-{idx + 1:03d}"
        invoice, created = Invoice.objects.update_or_create(
            clinic=clinic,
            invoice_number=invoice_number,
            defaults={
                "patient": patient,
                "appointment": appointment,
                "consultation": consultation,
                "issue_date": consultation.consultation_date,
                "due_date": consultation.consultation_date + timedelta(days=15),
                "created_by": staff["reception"],
                "notes": "Factura demo de consulta.",
                "active": True,
            },
        )
        service = BillableService.objects.filter(clinic=clinic, code=service_code).first()
        if service and not invoice.items.filter(service=service).exists() and invoice.status != Invoice.Status.PAGADA:
            InvoiceItem.objects.create(invoice=invoice, service=service, quantity=1, unit_price=service.price)
        if created and idx % 3 != 0 and invoice.balance_due > 0:
            Payment.objects.create(
                invoice=invoice,
                payment_number=f"PAY-DEMO-{clinic_index}-{month_offset + 1:02d}-{idx + 1:03d}",
                payment_date=invoice.issue_date,
                amount=invoice.balance_due,
                method=[Payment.Method.EFECTIVO, Payment.Method.TARJETA, Payment.Method.TRANSFERENCIA][idx % 3],
                reference=f"REF-DEMO-{clinic_index}{month_offset}{idx}",
                received_by=staff["reception"],
            )
        if created and idx % 5 == 0 and invoice.fiscal_status == Invoice.FiscalStatus.DRAFT:
            try:
                issue_fiscal_invoice(invoice, staff["reception"])
            except Exception:
                pass
        return invoice if created else None

    def ensure_today_work(self, clinic, staff, doctors, patients):
        today = timezone.localdate()
        for idx, patient in enumerate(patients[:4]):
            record = MedicalRecord.objects.get(patient=patient)
            PatientVisit.objects.update_or_create(
                clinic=clinic,
                patient=patient,
                visit_date=today,
                reason=["Consulta espontanea", "Control de signos", "Dolor agudo", "Seguimiento"][idx],
                defaults={
                    "medical_record": record,
                    "arrival_time": timezone.now() - timedelta(minutes=45 - idx * 8),
                    "visit_type": PatientVisit.VisitType.WALK_IN,
                    "origin": PatientVisit.Origin.RECEPTION,
                    "priority": PatientVisit.Priority.URGENT if idx == 2 else PatientVisit.Priority.NORMAL,
                    "status": [
                        PatientVisit.Status.WAITING_TRIAGE,
                        PatientVisit.Status.IN_TRIAGE,
                        PatientVisit.Status.WAITING_DOCTOR,
                        PatientVisit.Status.WAITING_PAYMENT,
                    ][idx],
                    "symptoms": "Registro demo para cola operativa.",
                    "assigned_doctor": doctors[idx % len(doctors)],
                    "assigned_nurse": staff["nurse"],
                    "created_by": staff["reception"],
                    "checked_in_by": staff["reception"],
                    "active": True,
                },
            )

    def ensure_notifications(self, clinic, patients):
        for patient in patients[:3]:
            if not patient.user_id:
                continue
            create_notification(
                patient.user,
                "Bienvenido al portal paciente",
                f"{clinic.nombre} ya tiene disponible tu informacion demo.",
                clinic=clinic,
                notification_type=Notification.Type.INFO,
                module=Notification.Module.SYSTEM,
                priority=Notification.Priority.NORMAL,
            )

    def user(self, email, name, role, clinic):
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
        if created:
            user.set_password(PASSWORD)
        user.save()
        return user

    def next_weekday(self, value):
        while value.weekday() >= 5:
            value -= timedelta(days=1)
        return value
