# Máquina de estados de consulta médica

## Visita

```text
waiting_triage
  -> in_triage
  -> waiting_doctor
  -> in_consultation
  -> consultation_finished | waiting_billing
  -> completed mediante el flujo posterior correspondiente
```

La transición desde `in_consultation` depende de `ClinicWorkflowSettings.auto_send_to_billing_after_consultation`:

| Configuración | Estado posterior |
| --- | --- |
| `true` | `waiting_billing` |
| `false` | `consultation_finished` |

La finalización médica no registra pagos, no abre caja y no marca una factura como pagada.

## Consulta

```text
borrador
  -> finalizada

borrador
  -> anulada, mediante el flujo autorizado existente
```

Una consulta `finalizada`:

- Conserva `finalized_at` y `finalized_by`.
- Rechaza PATCH/PUT y guardado de borrador con HTTP 409.
- Puede consultarse en modo de lectura.
- No vuelve a ejecutar la transición si se repite la finalización.

## Reglas de inicio

- Solo el rol médico.
- Misma clínica.
- Médico asignado o médico propietario permitido.
- Estado `waiting_doctor` o `in_consultation`.
- Triaje completado cuando la configuración lo exige.
- Una sola consulta por visita.

## Idempotencia

- La visita se bloquea con `select_for_update()`.
- La operación usa `transaction.atomic()`.
- La base impone unicidad de `patient_visit` en consulta.
- El reintento devuelve la misma consulta con `created=false`.
- La auditoría de inicio y finalización se registra una sola vez.

