from apps.patients.models import Patient
from tests.security.base import SecurityTestCase


class SuperAdminClinicalRestrictionTests(SecurityTestCase):
    def test_superadmin_is_saas_operator_not_clinical_reader(self):
        patient = Patient.objects.create(clinic=self.clinic_a, user=self.patient_user_a, nombres="Clínico", apellidos="Privado", codigo_paciente="SUPER-BLOCK")
        self.client.force_authenticate(user=self.superadmin)
        for path in [
            f"/api/patients/{patient.id}/",
            "/api/medical-records/",
            "/api/consultations/",
            "/api/documents/",
        ]:
            response = self.client.get(path)
            self.assertIn(response.status_code, [403, 404], (path, response.data))
