from tests.security.base import SecurityTestCase


class ClinicalPermissionTests(SecurityTestCase):
    def test_reception_and_cashier_cannot_create_clinical_consultations(self):
        for role in ["recepcionista", "cajero"]:
            user = self.create_user(f"{role}@security.test", role, self.clinic_a)
            self.client.force_authenticate(user=user)
            response = self.client.post("/api/consultations/", {}, format="json")
            self.assertEqual(response.status_code, 403, (role, response.data))
