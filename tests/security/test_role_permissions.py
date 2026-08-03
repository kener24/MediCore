from apps.patients.models import Patient
from tests.security.base import SecurityTestCase


class RolePermissionTests(SecurityTestCase):
    def test_cashier_cannot_read_patient_directory_or_clinical_documents(self):
        cashier = self.create_user("cashier-a@medicore.test", "cajero", self.clinic_a)
        patient = Patient.objects.create(clinic=self.clinic_a, user=self.patient_user_a, nombres="Rol", apellidos="Protegido", codigo_paciente="ROLE-A")
        self.client.force_authenticate(user=cashier)
        self.assertEqual(self.client.get("/api/patients/").status_code, 403)
        self.assertIn(self.client.get(f"/api/patients/{patient.id}/").status_code, [403, 404])
        self.assertEqual(self.client.get("/api/documents/").status_code, 403)
