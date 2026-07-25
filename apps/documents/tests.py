from datetime import date

from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User
from apps.clinics.models import Clinic
from apps.doctors.models import DoctorProfile, MedicalSpecialty
from apps.documents.models import ClinicalDocument, DocumentCategory
from apps.medical_records.models import ClinicalConsultation, MedicalRecord
from apps.patients.models import Patient


class ClinicalDocumentApiTests(APITestCase):
    def setUp(self):
        self.role_admin = Role.objects.create(nombre="admin")
        self.role_doctor = Role.objects.create(nombre="medico")
        self.role_patient = Role.objects.create(nombre="paciente")
        self.clinic = Clinic.objects.create(nombre="Clinica A", correo="a@x.com")
        self.other_clinic = Clinic.objects.create(nombre="Clinica B", correo="b@x.com")
        self.admin = User.objects.create_user(email="admin-docs@test.com", password="Admin12345*", nombre_completo="Admin", role=self.role_admin, clinica=self.clinic)
        self.patient_user = User.objects.create_user(email="patient-docs@test.com", password="Paciente12345*", nombre_completo="Paciente", role=self.role_patient, clinica=self.clinic)
        self.other_patient_user = User.objects.create_user(email="other-docs@test.com", password="Paciente12345*", nombre_completo="Otro", role=self.role_patient, clinica=self.other_clinic)
        self.patient = Patient.objects.create(clinic=self.clinic, user=self.patient_user, nombres="Juan", apellidos="Perez", codigo_paciente="PAC-T1")
        self.other_patient = Patient.objects.create(clinic=self.other_clinic, user=self.other_patient_user, nombres="Ana", apellidos="Lopez", codigo_paciente="PAC-T2")
        self.category = DocumentCategory.objects.create(name="Laboratorio", document_type=DocumentCategory.Type.LAB_RESULT)
        specialty = MedicalSpecialty.objects.create(nombre="Medicina documental")
        doctor_user = User.objects.create_user(email="doctor-docs@test.com", password="Doctor12345*", nombre_completo="Doctor A", role=self.role_doctor, clinica=self.clinic)
        other_doctor_user = User.objects.create_user(email="doctor-docs-b@test.com", password="Doctor12345*", nombre_completo="Doctor B", role=self.role_doctor, clinica=self.other_clinic)
        self.doctor = DoctorProfile.objects.create(clinic=self.clinic, user=doctor_user, specialty=specialty, numero_colegiacion="DOC-A")
        other_doctor = DoctorProfile.objects.create(clinic=self.other_clinic, user=other_doctor_user, specialty=specialty, numero_colegiacion="DOC-B")
        self.consultation = ClinicalConsultation.objects.create(
            clinic=self.clinic,
            medical_record=MedicalRecord.objects.create(patient=self.patient),
            patient=self.patient,
            doctor=self.doctor,
            consultation_date=date.today(),
            chief_complaint="Adjunto de prueba",
            created_by=self.admin,
        )
        self.other_consultation = ClinicalConsultation.objects.create(
            clinic=self.other_clinic,
            medical_record=MedicalRecord.objects.create(patient=self.other_patient),
            patient=self.other_patient,
            doctor=other_doctor,
            consultation_date=date.today(),
            chief_complaint="Adjunto ajeno",
            created_by=other_doctor_user,
        )

    def auth(self, user):
        self.client.force_authenticate(user=user)

    def file(self, name="test.pdf", content=b"%PDF-1.4\n%%EOF"):
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
        self.assertEqual(ClinicalDocument.objects.get().mime_type, "application/pdf")

    def test_admin_cannot_upload_document_for_other_clinic_patient(self):
        self.auth(self.admin)
        response = self.client.post(
            "/api/documents/",
            {"patient": self.other_patient.id, "title": "Cruce", "file": self.file()},
            format="multipart",
        )
        self.assertEqual(response.status_code, 400)

    def test_consultation_document_upload_and_cross_clinic_access(self):
        self.auth(self.admin)
        created = self.client.post(
            f"/api/consultations/{self.consultation.id}/documents/",
            {"title": "Resultado de consulta", "file": self.file("resultado.pdf")},
            format="multipart",
        )
        self.assertEqual(created.status_code, 201)
        document = ClinicalDocument.objects.get(pk=created.data["id"])
        self.assertEqual(document.consultation_id, self.consultation.id)
        self.assertEqual(document.patient_id, self.patient.id)

        self.assertEqual(
            self.client.get(f"/api/consultations/{self.other_consultation.id}/documents/").status_code,
            404,
        )
        self.assertEqual(
            self.client.post(
                f"/api/consultations/{self.other_consultation.id}/documents/",
                {"title": "Cruce", "file": self.file("cruce.pdf")},
                format="multipart",
            ).status_code,
            404,
        )

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

    def test_extension_permitida_con_contenido_falso_es_rechazada(self):
        self.auth(self.admin)
        disguised = SimpleUploadedFile("falso.pdf", b"contenido que no es pdf", content_type="application/pdf")
        response = self.client.post("/api/documents/", {"patient": self.patient.id, "title": "Falso", "file": disguised}, format="multipart")
        self.assertEqual(response.status_code, 400)
        self.assertIn("contenido real", str(response.data).lower())

    def test_deleted_document_cannot_be_downloaded(self):
        doc = ClinicalDocument.objects.create(clinic=self.clinic, patient=self.patient, title="Eliminado", file=self.file(), original_filename="deleted.pdf", file_size=7, file_extension="pdf", visible_to_patient=True, status=ClinicalDocument.Status.DELETED, active=False)
        self.auth(self.admin)
        response = self.client.get(f"/api/documents/{doc.id}/download/")
        self.assertEqual(response.status_code, 404)

    def test_admin_cannot_download_document_from_other_clinic(self):
        document = ClinicalDocument.objects.create(
            clinic=self.other_clinic,
            patient=self.other_patient,
            title="Documento ajeno",
            file=self.file("foreign.pdf"),
            original_filename="foreign.pdf",
            file_size=7,
            file_extension="pdf",
        )
        self.auth(self.admin)
        response = self.client.get(f"/api/documents/{document.id}/download/")
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
