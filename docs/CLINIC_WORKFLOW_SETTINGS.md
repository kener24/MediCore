# Configuración de flujo clínico

Modelo: `ClinicWorkflowSettings`.

Endpoint de clínica:

```text
GET /api/clinic/workflow-settings/
PATCH /api/clinic/workflow-settings/
```

Endpoint técnico para superadmin:

```text
GET /api/clinic-settings/clinics/{clinic_id}/workflow/
```

## Campos

| Campo | Propósito |
| --- | --- |
| `allow_walk_in_patients` | Permite pacientes sin cita. |
| `allow_appointments` | Permite citas. |
| `allow_online_appointments` | Permite citas en línea. |
| `allow_in_person_appointments` | Permite citas presenciales. |
| `reception_can_create_minimal_patient` | Recepción puede crear paciente básico. |
| `reception_handles_cashier` | Recepción también funciona como caja. |
| `walk_in_requires_triage` | Paciente sin cita pasa por triaje. |
| `appointment_requires_triage` | Paciente con cita pasa por triaje. |
| `appointment_direct_to_doctor` | Paciente con cita pasa directo al médico. |
| `billing_before_consultation` | Cobro antes de consulta. |
| `billing_after_consultation` | Cobro después de consulta. |
| `require_payment_before_consultation` | Exige pago previo. |
| `allow_consultation_without_payment` | Permite consulta sin pago previo. |
| `require_identity_for_patient` | Identidad requerida. |
| `require_phone_for_patient` | Teléfono requerido. |
| `allow_doctor_to_create_patient` | Médico puede crear paciente. |
| `allow_nurse_to_edit_patient_basic_data` | Enfermería edita datos básicos. |
| `auto_send_to_billing_after_consultation` | Al finalizar consulta pasa a caja. |
| `auto_complete_visit_after_payment` | Pago completa visita automáticamente. |

## Permisos

- Admin clínica: puede ver y modificar.
- Superadmin: puede ver configuración técnica por clínica, no datos clínicos.
- Recepción, caja, médico, enfermería y paciente: no modifican.
