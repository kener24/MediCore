from django.core.files.uploadedfile import SimpleUploadedFile

from apps.documents.models import ClinicalDocument
from apps.patients.models import Patient
from tests.security.base import SecurityTestCase


class PrivateFileSecurityTests(SecurityTestCase):
    def test_private_document_has_only_authenticated_api_urls(self):
        patient = Patient.objects.create(clinic=self.clinic_a, user=self.patient_user_a, nombres="Archivo", apellidos="Seguro", codigo_paciente="FILE-A")
        document = ClinicalDocument.objects.create(
            clinic=self.clinic_a,
            patient=patient,
            title="Privado",
            file=SimpleUploadedFile("seguro.pdf", b"%PDF-1.4\n%%EOF", content_type="application/pdf"),
            original_filename="seguro.pdf",
            file_size=15,
            file_extension="pdf",
        )
        self.client.force_authenticate(user=self.admin_a)
        response = self.client.get(f"/api/documents/{document.id}/")
        self.assertEqual(response.status_code, 200)
        self.assertIn(f"/api/documents/{document.id}/download/", response.data["download_url"])
        self.assertNotIn("/media/", str(response.data))

        self.client.force_authenticate(user=self.admin_b)
        self.assertEqual(self.client.get(f"/api/documents/{document.id}/download/").status_code, 404)
