"""Repeatable local endpoint performance profile for production-readiness reviews."""

import json
import os
import statistics
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django

django.setup()

from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient

from apps.accounts.models import User


SAMPLES = 7
CASES = [
    ("superadmin_dashboard", "superadmin", "/api/admin/dashboard/"),
    ("superadmin_clinics", "superadmin", "/api/clinics/"),
    ("clinic_dashboard", "admin", "/api/clinic-admin/dashboard/"),
    ("appointments", "recepcionista", "/api/appointments/"),
    ("patient_search", "recepcionista", "/api/reception/patients/search/?search=ana"),
    ("triage_queue", "enfermera", "/api/nursing/triage-queue/"),
    ("hospitalizations", "enfermera", "/api/hospitalization/admissions/"),
    ("doctor_dashboard", "medico", "/api/doctor/dashboard/"),
    ("doctor_waiting_room", "medico", "/api/doctor/waiting-room/"),
    ("consultations", "medico", "/api/consultations/"),
    ("billing_stats", "admin", "/api/billing/stats/"),
    ("invoices", "admin", "/api/billing/invoices/"),
    ("inventory_items", "admin", "/api/inventory/items/"),
    ("inventory_lots", "admin", "/api/inventory/lots/"),
    ("inventory_movements", "admin", "/api/inventory/movements/"),
    ("patient_dashboard", "paciente", "/api/patient-portal/dashboard/"),
    ("patient_appointments", "paciente", "/api/patient-portal/appointments/"),
    ("patient_invoices", "paciente", "/api/patient-portal/invoices/"),
    ("patient_notifications", "paciente", "/api/patient-portal/notifications/"),
]


def user_for(role):
    preferred = {
        "superadmin": "admin@medicore.com",
        "admin": "clinicadmin@medicore.com",
        "medico": "doctor@medicore.com",
        "enfermera": "enfermera@medicore.com",
        "recepcionista": "recepcion@medicore.com",
        "paciente": "paciente@medicore.com",
    }
    return (
        User.objects.select_related("role", "clinica")
        .filter(email=preferred[role], is_active=True)
        .first()
        or User.objects.select_related("role", "clinica")
        .filter(role__nombre=role, is_active=True)
        .first()
    )


def percentile(values, fraction):
    ordered = sorted(values)
    index = min(len(ordered) - 1, max(0, round((len(ordered) - 1) * fraction)))
    return ordered[index]


results = []
for name, role, path in CASES:
    user = user_for(role)
    if not user:
        results.append({"name": name, "skipped": f"No active {role} user"})
        continue
    client = APIClient(HTTP_HOST="localhost")
    client.force_authenticate(user=user)
    client.get(path)
    durations = []
    query_counts = []
    response_size = 0
    status_code = 0
    for _ in range(SAMPLES):
        with CaptureQueriesContext(connection) as queries:
            started = time.perf_counter()
            response = client.get(path)
            durations.append((time.perf_counter() - started) * 1000)
        query_counts.append(len(queries))
        response_size = len(response.content)
        status_code = response.status_code
    results.append(
        {
            "name": name,
            "path": path,
            "role": role,
            "status": status_code,
            "queries": round(statistics.median(query_counts)),
            "response_bytes": response_size,
            "p50_ms": round(percentile(durations, 0.50), 2),
            "p95_ms": round(percentile(durations, 0.95), 2),
            "p99_ms": round(percentile(durations, 0.99), 2),
        }
    )

print(json.dumps(results, indent=2, sort_keys=True))
