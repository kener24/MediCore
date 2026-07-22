# Flujo de check-in de citas

## Endpoints compatibles

- `PATCH|POST /api/appointments/{id}/check-in/`
- `POST /api/admissions/check-in-appointment/` con `appointment` en el cuerpo

Ambos delegan al mismo servicio de dominio y devuelven la misma estructura:

```json
{
  "success": true,
  "appointment_id": 10,
  "visit_id": 25,
  "visit": { "id": 25, "status": "waiting_triage" },
  "created": true,
  "message": "Check-in realizado correctamente."
}
```

En un reintento, `created` es `false`, `visit_id` no cambia y se responde 200.

## Garantías

1. `transaction.atomic()` cubre la operación.
2. `select_for_update()` bloquea la cita durante el check-in.
3. La restricción `unique_visit_per_appointment` impide dos visitas para la misma cita incluso ante concurrencia.
4. No se duplica el evento exitoso de auditoría.
5. Paciente, médico y clínica se derivan de la cita autenticada.
6. Citas canceladas, atendidas o no-show no pueden recibirse.
7. Una cita existente en línea o presencial no se invalida por una comprobación tardía de modalidad.

## Respuesta de interfaz

Mientras se procesa, web y móvil deshabilitan la acción. Al terminar, abren la visita creada o recuperada. Los listados reciben `visit_id` y muestran “Ver visita” en lugar de repetir el check-in.

## Auditoría

Solo la creación real genera “Check-in de cita registrado”. Recuperar una visita ya existente no se registra como un segundo check-in exitoso.
