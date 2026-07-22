# Máquina de estados de admisión

## Estados manejados por recepción

| Estado | Significado | Acciones de recepción |
| --- | --- | --- |
| `registered` | Visita creada y pendiente de enrutar | Enviar a triaje, enviar a médico si está permitido, cancelar |
| `waiting_triage` | En cola de enfermería | Enviar a médico solo si la configuración permite omitir triaje, cancelar |
| `waiting_doctor` | En sala del médico asignado | Enviar a triaje si corresponde, cancelar |
| `cancelled` | Historial cancelado | Ninguna transición operativa |

## Transiciones permitidas

```text
registered -> waiting_triage
registered -> waiting_doctor
registered -> cancelled
waiting_triage -> waiting_doctor (solo cuando triaje no es obligatorio)
waiting_triage -> cancelled
waiting_doctor -> waiting_triage
waiting_doctor -> cancelled
```

Las llamadas repetidas a “enviar a triaje” o “enviar a médico” en el estado final esperado son idempotentes.

## Transiciones bloqueadas

Recepción no puede establecer directamente `in_triage`, `in_consultation`, `consultation_finished`, `waiting_payment`, `paid` ni `completed`. El serializer de visita acepta en actualización genérica únicamente notas operativas; los campos críticos son de solo lectura.

No se permite cancelar desde recepción una visita ya iniciada en triaje, consulta, facturación, pagada o completada. La cancelación requiere motivo y conserva el registro. Si proviene de una cita, la cita no se elimina ni se cancela automáticamente.

## Colas

- `waiting_triage` aparece en la cola de enfermería.
- `waiting_doctor` aparece para el médico asignado.
- Envío directo exige médico de la clínica.
- Triaje obligatorio nunca puede omitirse desde recepción.
