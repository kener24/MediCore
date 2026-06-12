from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User
from apps.clinics.models import Clinic
from apps.documents.models import ClinicalDocument, DocumentCategory
from apps.patients.models import Patient


class ClinicalDocumentApiTests(APITestCase):
    def setUp(self):
        self.role_admin = Role.objects.create(nombre="admin")
        self.role_patient = Role.objects.create(nombre="paciente")
        self.clinic = Clinic.objects.create(nombre="Clinica A", correo="a@x.com")
        self.other_clinic = Clinic.objects.create(nombre="Clinica B", correo="b@x.com")
        self.admin = User.objects.create_user(email="admin-docs@test.com", password="Admin12345*", nombre_completo="Admin", role=self.role_admin, clinica=self.clinic)
        self.patient_user = User.objects.create_user(email="patient-docs@test.com", password="Paciente12345*", nombre_completo="Paciente", role=self.role_patient, clinica=self.clinic)
        self.other_patient_user = User.objects.create_user(email="other-docs@test.com", password="Paciente12345*", nombre_completo="Otro", role=self.role_patient, clinica=self.other_clinic)
        self.patient = Patient.objects.create(clinic=self.clinic, user=self.patient_user, nombres="Juan", apellidos="Perez", codigo_paciente="PAC-T1")
        self.other_patient = Patient.objects.create(clinic=self.other_clinic, user=self.other_patient_user, nombres="Ana", apellidos="Lopez", codigo_paciente="PAC-T2")
        self.category = DocumentCategory.objects.create(name="Laboratorio", document_type=DocumentCategory.Type.LAB_RESULT)

    def auth(self, user):
        self.client.force_authenticate(user=user)

    def file(self, name="test.pdf", content=b"archivo"):
        return SimpleUploadedFile(name, content, content_type="application/pdf")

    def test_admin_uploads_document_for_own_clinic_patient(self):
        self.auth(self.admin)
        response = self.client.post(
            "/api/documents/",
            {"patient": self.patient.id, "category": self.category.id, "title": "Hemograma", "file": self.file()},
            format="multipart",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(ClinicalDocument.objects.count(), 1)

    def test_admin_cannot_upload_document_for_other_clinic_patient(self):
        self.auth(self.admin)
        response = self.client.post(
            "/api/documents/",
            {"patient": self.other_patient.id, "title": "Cruce", "file": self.file()},
            format="multipart",
        )
        self.assertEqual(response.status_code, 400)

    def test_patient_sees_only_visible_own_documents(self):
        ClinicalDocument.objects.create(clinic=self.clinic, patient=self.patient, title="Visible", file=self.file(), original_filename="visible.pdf", file_size=7, file_extension="pdf", visible_to_patient=True)
        ClinicalDocument.objects.create(clinic=self.clinic, patient=self.patient, title="Oculto", file=self.file("hidden.pdf"), original_filename="hidden.pdf", file_size=7, file_extension="pdf", visible_to_patient=False)
        ClinicalDocument.objects.create(clinic=self.other_clinic, patient=self.other_patient, title="Otro", file=self.file("other.pdf"), original_filename="other.pdf", file_size=7, file_extension="pdf", visible_to_patient=True)
        self.auth(self.patient_user)
        response = self.client.get("/api/patient-portal/documents/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], "Visible")

    def test_dangerous_extension_is_rejected(self):
        self.auth(self.admin)
        bad = SimpleUploadedFile("bad.exe", b"bad", content_type="application/octet-stream")
        response = self.client.post("/api/documents/", {"patient": self.patient.id, "title": "Bad", "file": bad}, format="multipart")
        self.assertEqual(response.status_code, 400)

    def test_deleted_document_cannot_be_downloaded(self):
        doc = ClinicalDocument.objects.create(clinic=self.clinic, patient=self.patient, title="Eliminado", file=self.file(), original_filename="deleted.pdf", file_size=7, file_extension="pdf", visible_to_patient=True, status=ClinicalDocument.Status.DELETED, active=False)
        self.auth(self.admin)
        response = self.client.get(f"/api/documents/{doc.id}/download/")
        self.assertEqual(response.status_code, 404)

    def test_archive_restore_and_stats(self):
        doc = ClinicalDocument.objects.create(clinic=self.clinic, patient=self.patient, title="Doc", file=self.file(), original_filename="doc.pdf", file_size=7, file_extension="pdf")
        self.auth(self.admin)
        self.assertEqual(self.client.patch(f"/api/documents/{doc.id}/archive/").status_code, 200)
        doc.refresh_from_db()
        self.assertEqual(doc.status, ClinicalDocument.Status.ARCHIVED)
        self.assertEqual(self.client.patch(f"/api/documents/{doc.id}/restore/").status_code, 200)
        response = self.client.get("/api/documents/stats/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["total_documents"], 1)
