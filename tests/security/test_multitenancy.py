from datetime import date

from apps.doctors.models import DoctorProfile, MedicalSpecialty
from apps.patients.models import Patient
from tests.security.base import SecurityTestCase


class MultiTenantSecurityTests(SecurityTestCase):
    def setUp(self):
        super().setUp()
        self.patient_a = Patient.objects.create(clinic=self.clinic_a, user=self.patient_user_a, nombres="Paciente", apellidos="A", codigo_paciente="SEC-A")
        self.patient_b = Patient.objects.create(clinic=self.clinic_b, user=self.patient_user_b, nombres="Paciente", apellidos="B", codigo_paciente="SEC-B")

    def test_clinic_admin_and_patient_cannot_retrieve_foreign_patient(self):
        for user in [self.admin_a, self.patient_user_a]:
            self.client.force_authenticate(user=user)
            response = self.client.get(f"/api/patients/{self.patient_b.id}/")
            self.assertEqual(response.status_code, 404)

    def test_superadmin_cannot_open_clinical_patient_resource(self):
        self.client.force_authenticate(user=self.superadmin)
        self.assertEqual(self.client.get("/api/patients/").status_code, 403)
        self.assertEqual(self.client.get(f"/api/patients/{self.patient_a.id}/").status_code, 404)

    def test_cross_clinic_relationship_is_rejected(self):
        specialty = MedicalSpecialty.objects.create(nombre="Seguridad clínica")
        doctor_user_b = self.create_user("doctor-b@medicore.test", "medico", self.clinic_b)
        doctor_b = DoctorProfile.objects.create(
            clinic=self.clinic_b,
            user=doctor_user_b,
            specialty=specialty,
            numero_colegiacion="SEC-B-1",
        )
        self.client.force_authenticate(user=self.admin_a)
        response = self.client.post(
            "/api/appointments/",
            {
                "patient": self.patient_a.id,
                "doctor": doctor_b.id,
                "scheduled_date": str(date.today()),
                "start_time": "09:00",
                "reason": "Intento cruzado",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("misma clinica", str(response.data).lower())
