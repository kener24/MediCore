from apps.patients.models import Patient
from tests.security.base import SecurityTestCase


class IDORProtectionTests(SecurityTestCase):
    def test_manipulated_patient_id_returns_not_found_without_metadata(self):
        foreign = Patient.objects.create(clinic=self.clinic_b, user=self.patient_user_b, nombres="IDOR", apellidos="Protegido", codigo_paciente="IDOR-B")
        self.client.force_authenticate(user=self.admin_a)
        response = self.client.get(f"/api/patients/{foreign.id}/")
        self.assertEqual(response.status_code, 404)
        self.assertNotIn("IDOR", str(response.data))
        self.assertNotIn(self.clinic_b.nombre, str(response.data))
