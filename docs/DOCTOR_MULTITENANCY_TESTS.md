# Pruebas multi-clínica de consulta médica

## Matriz automatizada

| Caso | Resultado esperado | Estado local |
| --- | --- | --- |
| Médico A inicia visita A asignada | 200 y consulta propia | Aprobado |
| Doble inicio de la misma visita | Misma consulta y una auditoría | Aprobado |
| Segunda consulta para la misma visita | Restricción de base de datos | Aprobado |
| Médico distinto de Clínica A inicia visita asignada | 404 | Aprobado |
| Médico A usa un ID de Clínica B | 404 | Aprobado |
| Médico B abre contexto de consulta A | 404 | Aprobado |
| Rol no médico intenta editar | 403 o 404 | Aprobado |
| Cliente guarda con versión obsoleta | 409 sin sobrescritura | Aprobado |
| Edición después de finalizar | 409 | Aprobado |
| Doble finalización | 200 idempotente y una auditoría | Aprobado |
| Clínica con envío automático a caja | `waiting_billing` | Aprobado |
| Clínica sin envío automático a caja | `consultation_finished` | Aprobado |

## Aislamiento de borradores

Web y móvil construyen la clave local con clínica, usuario, paciente, visita y consulta. Un borrador de un médico no coincide con la clave de otro usuario o clínica. El logout explícito elimina los borradores privados del dispositivo.

## Sprint 1.3B: recursos asociados a consulta

| Caso | Resultado esperado | Estado local |
| --- | --- | --- |
| Médico A abre receta u orden de Clínica B | 404 | Aprobado |
| Médico A crea receta para consulta de Clínica B | Rechazado | Aprobado |
| Médico A consume producto o lote de Clínica B | 400/404 sin movimiento | Aprobado |
| Médico A lista o carga adjuntos en consulta B | 404 | Aprobado |
| Paciente abre PDF de receta ajena | 404 | Aprobado |
| Paciente descarga documento ajeno u oculto | 404 | Aprobado |
| Reintento de consumo con la misma clave | Mismo consumo, sin segundo descuento | Aprobado |

Las pruebas usan dos clínicas, usuarios y pacientes sintéticos. La aplicación móvil no envía un `clinicId` arbitrario en estos flujos; el backend deriva la clínica desde la sesión y la consulta.

## Prueba de producción

La evidencia de Clínica A, Clínica B e intentos cruzados debe registrarse en `PRODUCTION_TEST_EVIDENCE.md` después del despliegue. No se deben guardar tokens, contraseñas, identidades ni texto clínico real.
