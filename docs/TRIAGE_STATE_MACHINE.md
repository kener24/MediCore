# Máquina de estados del triaje

## Transiciones permitidas

```text
waiting_triage
  -> start-triage
in_triage
  -> signos vitales + evaluación + prioridad
  -> complete-triage
waiting_doctor
```

## Reglas

| Estado | Acción de enfermería | Resultado |
| --- | --- | --- |
| `waiting_triage` | Iniciar | `in_triage` |
| `in_triage` | Registrar/corregir signos | Permanece `in_triage` |
| `in_triage` | Completar con requisitos | `waiting_doctor` |
| `waiting_doctor` con triaje terminado | Reintentar completar | Respuesta idempotente |

No se permite iniciar desde `registered`, `waiting_doctor`, `in_consultation`, `completed`, `cancelled` ni `no_show`.

## Concurrencia

`start_triage`, `record_vital_signs` y `complete_triage` usan `transaction.atomic()` y `select_for_update()` sobre la visita. La primera enfermera obtiene el triaje; otra recibe el mensaje controlado `El triaje ya fue iniciado por otro usuario.`

## Configuración

La decisión de pasar por triaje depende de `ClinicWorkflowSettings`:

- Citas: `appointment_requires_triage`.
- Otras visitas: `walk_in_requires_triage`.

Una visita incompatible con la configuración no aparece en la cola y el backend bloquea el inicio; el frontend no decide la transición.

## Invariantes verificadas

- Inicio anterior a finalización.
- Una visita completada deja la cola de triaje.
- La misma visita aparece en sala médica.
- La prioridad y el resumen quedan en la visita.
- El reintento no duplica auditoría, signos ni notificaciones.
- Una visita directa a médico no aparece como triaje completado.
