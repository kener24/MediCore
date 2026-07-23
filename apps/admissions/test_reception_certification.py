from datetime import time, timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User
from apps.admissions.models import PatientVisit
from apps.appointments.models import Appointment
from apps.audit.models import AuditLog
from apps.clinic_settings.models import ClinicWorkflowSettings
from apps.clinics.models import Clinic
from apps.doctors.models import DoctorProfile, DoctorSchedule, MedicalSpecialty
from apps.medical_records.models import MedicalRecord
from apps.patients.models import Patient


def weekday_name(value):
    return ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"][value.weekday()]


class ReceptionCertificationTests(APITestCase):
    def setUp(self):
        self.roles = {
            name: Role.objects.create(nombre=name)
            for name in ["admin", "recepcionista", "enfermera", "medico", "paciente"]
        }
        self.clinic_a = Clinic.objects.create(nombre="Clinica A")
        self.clinic_b = Clinic.objects.create(nombre="Clinica B")
        self.workflow_a = ClinicWorkflowSettings.objects.create(
            clinic=self.clinic_a,
            appointment_requires_triage=True,
            appointment_direct_to_doctor=False,
            walk_in_requires_triage=True,
        )
        self.workflow_b = ClinicWorkflowSettings.objects.create(
            clinic=self.clinic_b,
            appointment_requires_triage=False,
            appointment_direct_to_doctor=True,
            walk_in_requires_triage=False,
        )
        self.reception_a = self.user("reception-a@test.local", "recepcionista", self.clinic_a)
        self.reception_b = self.user("reception-b@test.local", "recepcionista", self.clinic_b)
        self.admin_a = self.user("admin-a@test.local", "admin", self.clinic_a)
        self.nurse_a = self.user("nurse-a@test.local", "enfermera", self.clinic_a)
        self.nurse_b = self.user("nurse-b@test.local", "enfermera", self.clinic_b)
        self.doctor_user_a = self.user("doctor-a@test.local", "medico", self.clinic_a)
        self.doctor_user_b = self.user("doctor-b@test.local", "medico", self.clinic_b)
        self.patient_user_a = self.user("patient-a@test.local", "paciente", self.clinic_a)
        specialty = MedicalSpecialty.objects.create(nombre="Medicina general")
        self.doctor_a = DoctorProfile.objects.create(
            clinic=self.clinic_a,
            user=self.doctor_user_a,
            specialty=specialty,
            numero_colegiacion="A-100",
        )
        self.doctor_b = DoctorProfile.objects.create(
            clinic=self.clinic_b,
            user=self.doctor_user_b,
            specialty=specialty,
            numero_colegiacion="B-100",
        )
        today = timezone.localdate()
        tomorrow = today + timedelta(days=1)
        for doctor in [self.doctor_a, self.doctor_b]:
            for day_name in {weekday_name(today), weekday_name(tomorrow)}:
                DoctorSchedule.objects.create(
                    doctor=doctor,
                    dia_semana=day_name,
                    hora_inicio=time(8, 0),
                    hora_fin=time(17, 0),
                )
        self.patient_a = Patient.objects.create(
            clinic=self.clinic_a,
            user=self.patient_user_a,
            nombres="Ana",
            apellidos="Alvarez",
            identidad="080119900001",
            telefono="9999-0001",
        )
        self.patient_b = Patient.objects.create(
            clinic=self.clinic_b,
            nombres="Berta",
            apellidos="Benitez",
            identidad="080219900002",
            telefono="9999-0002",
        )

    def user(self, email, role, clinic):
        return User.objects.create_user(email=email, password="Test12345*", role=self.roles[role], clinica=clinic)

    def auth(self, user=None):
        self.client.force_authenticate(user=user or self.reception_a)

    def appointment(self, clinic=None, patient=None, doctor=None, modality=Appointment.Modality.PRESENCIAL):
        return Appointment.objects.create(
            clinic=clinic or self.clinic_a,
            patient=patient or self.patient_a,
            doctor=doctor or self.doctor_a,
            scheduled_date=timezone.localdate(),
            start_time=time(9, 0),
            end_time=time(9, 30),
            modality=modality,
            reason="Control",
        )

    def walk_in(self, patient=None, doctor=None):
        self.auth()
        return self.client.post(
            "/api/admissions/register-walk-in/",
            {
                "patient": (patient or self.patient_a).id,
                "visit": {
                    "reason": "Dolor abdominal",
                    "visit_type": "walk_in",
                    "assigned_doctor": doctor.id if doctor else None,
                },
            },
            format="json",
        )

    def test_patient_search_is_scoped_and_supports_identity_phone_name_and_code(self):
        self.auth()
        for term in ["Ana", self.patient_a.identidad, self.patient_a.telefono, self.patient_a.codigo_paciente]:
            response = self.client.get("/api/patients/", {"search": term})
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual([item["id"] for item in response.data], [self.patient_a.id])
        response = self.client.get("/api/patients/", {"search": "Berta"})
        self.assertEqual(response.data, [])

    def test_reception_cannot_create_visit_with_cross_clinic_relations(self):
        self.auth()
        response = self.walk_in(patient=self.patient_b)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        response = self.walk_in(doctor=self.doctor_b)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(PatientVisit.objects.exists())

    def test_reception_cannot_patch_clinical_status_directly(self):
        visit = self.create_visit(status=PatientVisit.Status.WAITING_TRIAGE)
        self.auth()
        response = self.client.patch(
            f"/api/admissions/visits/{visit.id}/",
            {"status": PatientVisit.Status.PAID},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        visit.refresh_from_db()
        self.assertEqual(visit.status, PatientVisit.Status.WAITING_TRIAGE)
        note_response = self.client.patch(
            f"/api/admissions/visits/{visit.id}/",
            {"notes": "Paciente validado en recepción."},
            format="json",
        )
        self.assertEqual(note_response.status_code, status.HTTP_200_OK)
        visit.refresh_from_db()
        self.assertEqual(visit.notes, "Paciente validado en recepción.")

    def test_check_in_is_idempotent_across_both_existing_endpoints(self):
        appointment = self.appointment()
        self.auth()
        first = self.client.patch(f"/api/appointments/{appointment.id}/check-in/", {}, format="json")
        second = self.client.post(
            "/api/admissions/check-in-appointment/",
            {"appointment": appointment.id},
            format="json",
        )
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertTrue(first.data["created"])
        self.assertFalse(second.data["created"])
        self.assertEqual(first.data["visit_id"], second.data["visit_id"])
        detail = self.client.get(f"/api/appointments/{appointment.id}/")
        self.assertEqual(detail.status_code, status.HTTP_200_OK)
        self.assertEqual(detail.data["visit_id"], first.data["visit_id"])
        self.assertEqual(PatientVisit.objects.filter(appointment=appointment).count(), 1)
        self.assertEqual(
            AuditLog.objects.filter(
                module=AuditLog.Module.ADMISSIONS,
                object_id=str(first.data["visit_id"]),
                description="Check-in de cita registrado.",
            ).count(),
            1,
        )

    def test_presential_check_in_ignores_disabled_online_creation(self):
        self.workflow_a.allow_online_appointments = False
        self.workflow_a.save()
        appointment = self.appointment(modality=Appointment.Modality.PRESENCIAL)
        self.auth()
        response = self.client.patch(f"/api/appointments/{appointment.id}/check-in/", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["visit"]["status"], PatientVisit.Status.WAITING_TRIAGE)

    def test_online_creation_respects_clinic_configuration(self):
        tomorrow = timezone.localdate() + timedelta(days=1)
        payload = {
            "patient": self.patient_a.id,
            "doctor": self.doctor_a.id,
            "scheduled_date": tomorrow.isoformat(),
            "start_time": "10:00",
            "modality": Appointment.Modality.ONLINE,
            "reason": "Seguimiento",
        }
        self.auth()
        blocked = self.client.post("/api/appointments/", payload, format="json")
        self.assertEqual(blocked.status_code, status.HTTP_400_BAD_REQUEST)
        self.workflow_a.allow_online_appointments = True
        self.workflow_a.save()
        allowed = self.client.post("/api/appointments/", payload, format="json")
        self.assertEqual(allowed.status_code, status.HTTP_201_CREATED)

    def test_cross_clinic_appointment_and_visit_ids_return_not_found(self):
        appointment_b = self.appointment(clinic=self.clinic_b, patient=self.patient_b, doctor=self.doctor_b)
        visit_b = self.create_visit(
            clinic=self.clinic_b,
            patient=self.patient_b,
            doctor=self.doctor_b,
            appointment=appointment_b,
            status=PatientVisit.Status.WAITING_DOCTOR,
        )
        self.auth()
        self.assertEqual(self.client.patch(f"/api/appointments/{appointment_b.id}/check-in/").status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.get(f"/api/admissions/visits/{visit_b.id}/").status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.patch(f"/api/reception/visits/{visit_b.id}/send-to-triage/").status_code, status.HTTP_404_NOT_FOUND)

    def test_walk_in_respects_disabled_configuration_and_active_visit(self):
        self.workflow_a.allow_walk_in_patients = False
        self.workflow_a.save()
        self.assertEqual(self.walk_in().status_code, status.HTTP_400_BAD_REQUEST)
        self.workflow_a.allow_walk_in_patients = True
        self.workflow_a.save()
        self.assertEqual(self.walk_in().status_code, status.HTTP_201_CREATED)
        duplicate = self.walk_in()
        self.assertEqual(duplicate.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(PatientVisit.objects.filter(patient=self.patient_a).count(), 1)

    def test_minimal_patient_respects_required_fields_and_reception_permission(self):
        self.workflow_a.require_identity_for_patient = True
        self.workflow_a.require_phone_for_patient = True
        self.workflow_a.save()
        self.auth()
        blocked = self.client.post(
            "/api/reception/patients/minimal/",
            {"nombres": "Carlos", "apellidos": "Cruz", "genero": "masculino"},
            format="json",
        )
        self.assertEqual(blocked.status_code, status.HTTP_400_BAD_REQUEST)
        self.workflow_a.reception_can_create_minimal_patient = False
        self.workflow_a.save()
        denied = self.client.post(
            "/api/reception/patients/minimal/",
            {"nombres": "Carlos", "apellidos": "Cruz", "identidad": "080319900003", "telefono": "99990003"},
            format="json",
        )
        self.assertEqual(denied.status_code, status.HTTP_400_BAD_REQUEST)

    def test_probable_duplicate_requires_confirmation_and_is_audited(self):
        self.auth()
        payload = {
            "nombres": "Ana Similar",
            "apellidos": "Prueba",
            "telefono": self.patient_a.telefono,
            "genero": "no_especificado",
        }
        warning = self.client.post("/api/reception/patients/minimal/", payload, format="json")
        self.assertEqual(warning.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("possible_duplicate", warning.data)
        confirmed = self.client.post(
            "/api/reception/patients/minimal/",
            {**payload, "duplicate_warning_confirmed": True},
            format="json",
        )
        self.assertEqual(confirmed.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            AuditLog.objects.filter(
                object_id=str(confirmed.data["id"]),
                description="Paciente creado tras confirmar advertencia de posible duplicado.",
            ).exists()
        )

    def test_reception_cannot_skip_required_triage(self):
        visit = self.create_visit(status=PatientVisit.Status.WAITING_TRIAGE)
        self.auth()
        response = self.client.patch(f"/api/reception/visits/{visit.id}/send-to-doctor/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        visit.refresh_from_db()
        self.assertEqual(visit.status, PatientVisit.Status.WAITING_TRIAGE)

    def test_direct_to_doctor_requires_assigned_doctor_and_uses_correct_queue(self):
        self.workflow_a.walk_in_requires_triage = False
        self.workflow_a.save()
        without_doctor = self.walk_in()
        self.assertEqual(without_doctor.status_code, status.HTTP_400_BAD_REQUEST)
        with_doctor = self.walk_in(doctor=self.doctor_a)
        self.assertEqual(with_doctor.status_code, status.HTTP_201_CREATED)
        self.assertEqual(with_doctor.data["status"], PatientVisit.Status.WAITING_DOCTOR)
        self.auth(self.doctor_user_a)
        queue = self.client.get("/api/doctor/waiting-room/")
        self.assertEqual([item["id"] for item in queue.data], [with_doctor.data["id"]])

    def test_send_to_triage_is_idempotent_and_audited_once(self):
        visit = self.create_visit(status=PatientVisit.Status.REGISTERED)
        self.auth()
        first = self.client.patch(f"/api/reception/visits/{visit.id}/send-to-triage/")
        second = self.client.patch(f"/api/reception/visits/{visit.id}/send-to-triage/")
        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(second.data["status"], PatientVisit.Status.WAITING_TRIAGE)
        self.assertEqual(
            AuditLog.objects.filter(
                module=AuditLog.Module.ADMISSIONS,
                object_id=str(visit.id),
                description="Paciente enviado a triaje.",
            ).count(),
            1,
        )

    def test_cancellation_requires_valid_state_reason_and_permission(self):
        waiting = self.create_visit(status=PatientVisit.Status.WAITING_TRIAGE)
        self.auth()
        short_reason = self.client.patch(f"/api/reception/visits/{waiting.id}/cancel/", {"reason": "no"}, format="json")
        self.assertEqual(short_reason.status_code, status.HTTP_400_BAD_REQUEST)
        cancelled = self.client.patch(
            f"/api/reception/visits/{waiting.id}/cancel/",
            {"reason": "Paciente decide retirarse"},
            format="json",
        )
        self.assertEqual(cancelled.status_code, status.HTTP_200_OK)
        self.assertEqual(cancelled.data["status"], PatientVisit.Status.CANCELLED)
        in_consultation = self.create_visit(patient=self.new_patient("Consulta"), status=PatientVisit.Status.IN_CONSULTATION)
        blocked = self.client.patch(
            f"/api/reception/visits/{in_consultation.id}/cancel/",
            {"reason": "Intento administrativo"},
            format="json",
        )
        self.assertEqual(blocked.status_code, status.HTTP_400_BAD_REQUEST)
        self.auth(self.nurse_a)
        forbidden = self.client.patch(
            f"/api/reception/visits/{in_consultation.id}/cancel/",
            {"reason": "Intento sin permiso"},
            format="json",
        )
        self.assertEqual(forbidden.status_code, status.HTTP_403_FORBIDDEN)

    def test_non_reception_roles_cannot_check_in_or_create_walk_in(self):
        appointment = self.appointment()
        for user in [self.nurse_a, self.doctor_user_a, self.patient_user_a]:
            self.auth(user)
            check_in = self.client.post(
                "/api/admissions/check-in-appointment/",
                {"appointment": appointment.id},
                format="json",
            )
            self.assertEqual(check_in.status_code, status.HTTP_400_BAD_REQUEST)
            walk_in = self.client.post(
                "/api/admissions/register-walk-in/",
                {"patient": self.patient_a.id, "visit": {"reason": "Sin permiso"}},
                format="json",
            )
            self.assertEqual(walk_in.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(PatientVisit.objects.exists())

    def create_visit(self, clinic=None, patient=None, doctor=None, appointment=None, status=PatientVisit.Status.REGISTERED):
        clinic = clinic or self.clinic_a
        patient = patient or self.patient_a
        record, _ = MedicalRecord.objects.get_or_create(patient=patient, defaults={"clinic": clinic})
        return PatientVisit.objects.create(
            clinic=clinic,
            patient=patient,
            appointment=appointment,
            medical_record=record,
            assigned_doctor=doctor or (self.doctor_a if clinic == self.clinic_a else self.doctor_b),
            reason="Evaluacion",
            status=status,
        )

    def new_patient(self, suffix):
        return Patient.objects.create(clinic=self.clinic_a, nombres="Paciente", apellidos=suffix)
