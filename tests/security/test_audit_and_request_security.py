import uuid

from django.core.exceptions import ValidationError

from apps.audit.models import AuditLog
from apps.audit.services import log_audit_event
from tests.security.base import SecurityTestCase


class AuditAndRequestSecurityTests(SecurityTestCase):
    def test_cors_allows_configured_origin_without_credentials_and_rejects_unknown_origin(self):
        allowed = self.client.get("/api/auth/me/", HTTP_ORIGIN="http://localhost:5173")
        self.assertEqual(allowed["Access-Control-Allow-Origin"], "http://localhost:5173")
        self.assertNotIn("Access-Control-Allow-Credentials", allowed)

        rejected = self.client.get("/api/auth/me/", HTTP_ORIGIN="https://evil.example")
        self.assertNotIn("Access-Control-Allow-Origin", rejected)

    def test_request_id_is_validated_returned_and_saved_in_audit(self):
        supplied = str(uuid.uuid4())
        self.client.force_authenticate(user=self.patient_user_a)
        response = self.client.get("/api/audit/logs/", HTTP_X_REQUEST_ID=supplied)
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response["X-Request-ID"], supplied)
        self.assertEqual(response.data["request_id"], supplied)
        self.assertTrue(AuditLog.objects.filter(request_id=supplied).exists())

        generated = self.client.get("/api/audit/logs/", HTTP_X_REQUEST_ID="not-a-uuid")["X-Request-ID"]
        self.assertNotEqual(generated, "not-a-uuid")
        uuid.UUID(generated)

    def test_audit_log_is_append_only_for_instance_and_queryset(self):
        entry = log_audit_event(user=self.admin_a, action=AuditLog.Action.VIEW, module=AuditLog.Module.SECURITY)
        entry.description = "manipulado"
        with self.assertRaises(ValidationError):
            entry.save()
        with self.assertRaises(ValidationError):
            AuditLog.objects.filter(pk=entry.pk).update(description="manipulado")
        with self.assertRaises(ValidationError):
            AuditLog.objects.bulk_update([entry], ["description"])
        with self.assertRaises(ValidationError):
            AuditLog.objects.filter(pk=entry.pk).delete()
        with self.assertRaises(ValidationError):
            AuditLog.objects.filter(pk=entry.pk)._raw_delete(using="default")

    def test_sensitive_values_are_redacted_from_audit_payload(self):
        entry = log_audit_event(
            user=self.admin_a,
            action=AuditLog.Action.UPDATE,
            module=AuditLog.Module.SECURITY,
            new_values={"password": "never-store", "refresh_token": "never-store", "allowed": "visible"},
        )
        self.assertNotIn("password", entry.after_data)
        self.assertNotIn("refresh_token", entry.after_data)
        self.assertEqual(entry.after_data["allowed"], "visible")
