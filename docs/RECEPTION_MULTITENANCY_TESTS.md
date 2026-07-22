# Pruebas multi-clínica de recepción

## Matriz certificada

| Caso | Resultado esperado | Cobertura automatizada |
| --- | --- | --- |
| Recepción A busca paciente B | Lista vacía | Aprobada |
| Recepción A abre visita B | 404 | Aprobada |
| Recepción A hace check-in de cita B | 404 | Aprobada |
| Recepción A crea visita para paciente B | 400 controlado | Aprobada |
| Recepción A asigna médico B | 400 controlado | Aprobada |
| Enfermería, médico o paciente hacen check-in | 400/403 sin crear visita | Aprobada |
| Manipulación de estado por `PATCH` genérico | 400 sin cambiar estado | Aprobada |
| Doble check-in por endpoints distintos | Misma visita y una auditoría | Aprobada |
| Visita directa sin médico | 400 | Aprobada |
| Salto de triaje obligatorio | 400 | Aprobada |

## Controles técnicos

- Todos los querysets clínicos se limitan a la clínica del usuario autenticado.
- Los IDs de clínica enviados por clientes no deciden la pertenencia del registro.
- Paciente, cita, médico y visita se vuelven a validar en backend.
- La configuración se obtiene de la clínica autenticada.
- El cambio de usuario o cierre de sesión limpia la caché de consultas móvil mediante el flujo global de autenticación existente.

## Evidencia local

El archivo `apps/admissions/test_reception_certification.py` contiene 14 escenarios de certificación. La suite dirigida de pacientes, citas, admisiones y configuración aprobó 55/55 pruebas; la suite global aprobó 263/263.

Las comprobaciones en producción deben repetirse después del despliegue usando registros sintéticos de Clínica A y Clínica B. No se documentan identificaciones, tokens ni datos clínicos.
