from tests.security.base import SecurityTestCase


class FinancialPermissionTests(SecurityTestCase):
    def test_patient_cannot_create_payment_or_delete_financial_record(self):
        self.client.force_authenticate(user=self.patient_user_a)
        create = self.client.post("/api/billing/payments/", {"invoice": 999999, "amount": "-1.00"}, format="json")
        self.assertIn(create.status_code, [403, 404])
        delete = self.client.delete("/api/billing/payments/999999/")
        self.assertEqual(delete.status_code, 405)
