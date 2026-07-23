# Certificación funcional de enfermería y triaje

Fecha de revisión: 2026-07-22

## Alcance

Se certificó el flujo existente, sin crear modelos, módulos ni endpoints paralelos:

1. Recepción registra una visita que requiere triaje.
2. Enfermería consulta la cola de su clínica.
3. Una enfermera toma la visita.
4. Registra o corrige un único conjunto inicial de signos vitales.
5. Registra motivo, evaluación inicial, prioridad y notas.
6. Completa el triaje y envía la visita a sala médica.

## Correcciones realizadas

- Inicio y finalización protegidos con transacción y bloqueo de fila.
- Doble inicio idempotente para la misma enfermera y bloqueado para otra.
- Finalización idempotente sin duplicar auditoría ni notificaciones.
- Cola filtrada por clínica, estado y configuración del flujo.
- Historial completado filtrado por `triage_completed_at`.
- Signos vitales permitidos únicamente durante `in_triage`.
- Médico con acceso de lectura, sin permiso para modificar signos de triaje.
- Un segundo guardado corrige el registro existente y no crea duplicados.
- Evaluación y prioridad móvil/web ahora se guardan en backend.
- Datos críticos visibles solo para admin clínica, enfermería y médico.
- Web y móvil muestran alergias, antecedentes y contacto de emergencia con estados vacíos explícitos.
- Móvil corrigió prioridades incompatibles y navegación a triajes completados.
- Formularios móviles advierten al salir con cambios sin guardar.

## Endpoints certificados

| Acción | Endpoint | Roles |
| --- | --- | --- |
| Cola | `GET /api/admissions/triage-queue/` | admin, enfermería |
| Iniciar | `PATCH /api/admissions/visits/{id}/start-triage/` | admin, enfermería |
| Signos | `GET /api/admissions/visits/{id}/vital-signs/` | admin, enfermería, médico |
| Guardar signos | `POST /api/admissions/visits/{id}/vital-signs/` | admin, enfermería |
| Completar | `PATCH /api/admissions/visits/{id}/complete-triage/` | admin, enfermería |
| Historial | `GET /api/admissions/visits/?status=waiting_doctor&triage_completed=true` | roles clínicos autorizados |
| Sala médica | `GET /api/admissions/doctor-waiting-room/` | admin, médico |

Las rutas alias `/api/nursing/...` existentes se conservaron para la app móvil.

## Requisitos de cierre

La finalización exige signos vitales, motivo de al menos 5 caracteres, evaluación inicial de al menos 10 caracteres y prioridad válida. El resultado esperado es:

```text
status = waiting_doctor
triage_completed_at != null
priority guardada
signos vitales asociados a la visita
```

## Resultado local

- Pruebas específicas de admisiones/triaje: 16/16.
- Pruebas dirigidas de admisiones, expedientes, pacientes, cuentas y auditoría: 105/105.
- Suite completa Django: 273/273 en 547.575 segundos con cuatro bases aisladas.
- `manage.py check`: aprobado.
- Migraciones pendientes: ninguna.
- Build web: aprobado.
- TypeScript móvil: aprobado.
- Lint web: 0 errores; advertencias heredadas.
- Lint móvil: aprobado.
- Expo Doctor: 18/18.

La prueba física Android se registra únicamente cuando una persona complete el flujo desde Expo Go; no se infiere desde compilación o bundle.
