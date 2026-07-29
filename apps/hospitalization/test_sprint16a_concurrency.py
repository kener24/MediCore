from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from unittest import skipUnless

from django.core.exceptions import ValidationError
from django.db import close_old_connections, connection
from django.test import TransactionTestCase

from apps.accounts.models import Role, User
from apps.clinics.models import Clinic
from apps.hospitalization.models import HospitalBed, HospitalBedAssignment, HospitalRoom, Hospitalization
from apps.hospitalization.services import assign_bed
from apps.patients.models import Patient


@skipUnless(connection.vendor == "mysql", "La concurrencia de camas se certifica sobre MySQL.")
class HospitalBedMySQLConcurrencyTests(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        role = Role.objects.create(nombre="admin")
        self.clinic = Clinic.objects.create(nombre="Clinica camas concurrentes")
        self.user = User.objects.create_user(email="beds-concurrency@test.local", password="Test12345*", nombre_completo="Admin", role=role, clinica=self.clinic)
        room = HospitalRoom.objects.create(clinic=self.clinic, name="General", room_number="C-1")
        self.bed = HospitalBed.objects.create(clinic=self.clinic, room=room, bed_number="1")
        patients = [Patient.objects.create(clinic=self.clinic, codigo_paciente=f"PC-{index}", nombres=f"Paciente {index}", apellidos="Prueba") for index in range(2)]
        self.hospitalizations = [Hospitalization.objects.create(clinic=self.clinic, patient=patient, admitted_by=self.user, reason="Prueba", status=Hospitalization.Status.PENDING_ADMISSION) for patient in patients]

    def test_two_patients_cannot_occupy_the_same_bed(self):
        barrier = Barrier(2)
        ids = [hospitalization.id for hospitalization in self.hospitalizations]

        def runner(hospitalization_id):
            close_old_connections()
            barrier.wait()
            try:
                assign_bed(Hospitalization.objects.get(pk=hospitalization_id), HospitalBed.objects.get(pk=self.bed.id), User.objects.get(pk=self.user.id))
                return "ok"
            except ValidationError:
                return "blocked"
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=2) as executor:
            outcomes = list(executor.map(runner, ids))
        self.assertEqual(sorted(outcomes), ["blocked", "ok"])
        self.assertEqual(HospitalBedAssignment.objects.filter(bed=self.bed, released_at__isnull=True).count(), 1)
        self.bed.refresh_from_db()
        self.assertEqual(self.bed.status, HospitalBed.Status.OCCUPIED)
