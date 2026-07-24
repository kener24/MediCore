# Certificación de consulta médica

Fecha de certificación local: 2026-07-24

## Alcance

Este sprint certifica el flujo existente desde la sala médica hasta la finalización de la consulta. No reemplaza modelos, pantallas ni servicios previos y no incluye la certificación profunda de recetas, órdenes, consumos, hospitalización o facturación clínica.

## Flujo certificado

1. Recepción registra la visita.
2. Enfermería completa triaje cuando la clínica lo exige.
3. El médico asignado ve la visita en su sala.
4. Iniciar consulta crea una sola consulta o recupera la existente.
5. La consulta integra identificación, triaje, alergias, antecedentes, signos e historial reciente.
6. Web y móvil conservan borradores, guardan automáticamente y detectan conflictos de versión.
7. Finalizar ejecuta un último guardado y valida motivo, evaluación o diagnóstico, y plan.
8. La consulta pasa a solo lectura y la visita avanza según la configuración de la clínica.

## Correcciones realizadas

- Inicio idempotente protegido con transacción, bloqueo de visita y unicidad por visita.
- Restricción de médico, clínica, asignación y triaje obligatorio.
- Control optimista mediante `version` y respuesta HTTP 409 ante una versión obsoleta.
- Endpoint de contexto clínico limitado a la consulta y al médico autorizado.
- Finalización idempotente, transaccional y no editable después del cierre.
- Destino posterior controlado únicamente por `ClinicWorkflowSettings`.
- Autosave web y móvil con indicador discreto y sin mensajes emergentes repetitivos.
- Borrador local aislado por clínica, usuario, paciente, visita y consulta.
- Recuperación con confirmación, manejo sin conexión y aviso al abandonar la pantalla.
- Ajuste de teclado y scroll en Android.

## Endpoints certificados

| Método | Endpoint | Uso |
| --- | --- | --- |
| GET | `/api/admissions/doctor-waiting-room/` | Sala médica propia |
| PATCH | `/api/admissions/visits/{id}/start-consultation/` | Iniciar o continuar |
| GET | `/api/consultations/{id}/` | Cargar consulta |
| POST/PATCH | `/api/consultations/{id}/save-draft/` | Guardar borrador |
| GET | `/api/consultations/{id}/clinical-context/` | Contexto clínico autorizado |
| POST | `/api/consultations/{id}/complete/` | Finalizar de forma idempotente |
| PATCH/POST | `/api/consultations/{id}/finalize/` | Compatibilidad de finalización existente |

## Evidencia local

- `python manage.py check`: aprobado.
- `python manage.py makemigrations --check --dry-run`: sin cambios pendientes.
- Suite completa Django: 283/283 aprobadas en 878.952 s.
- Regresión posterior de admisiones y certificación médica: 41/41 aprobadas.
- Build web Vite: aprobado.
- Lint web: 0 errores; 62 advertencias heredadas.
- TypeScript móvil: aprobado.
- Lint móvil: aprobado sin advertencias.
- Expo Doctor: 18/18.
- Export Android: aprobado; 1,510 módulos y bundle Hermes generado.
- Expo LAN: activo; manifest Android y bundle respondieron 200 desde `192.168.101.27:8081`.

## Evidencia de producción

- Respaldo MySQL y Git validado antes de migrar.
- Migración de versión y unicidad aplicada sin consultas duplicadas preexistentes.
- Clínica A y Clínica B completaron sala, inicio, contexto, guardado, conflicto y finalización por HTTPS.
- Los intentos cruzados devolvieron 404 y quedaron auditados sin contenido clínico externo.
- La consulta finalizada abrió en solo lectura y la consola web no mostró errores.
- Revisión final desplegada: `1c131f1`.
- Android físico permanece pendiente de confirmación manual; bundle y Expo Doctor sí están aprobados.

## Pendiente de Sprint 1.3B

- Validación avanzada de alergias contra medicamentos.
- Recetas repetibles y renovación.
- Órdenes con prioridad y vencimiento.
- Consumo automático de inventario.
- Adjuntos clínicos adicionales.
- Certificación profunda de facturación originada en consulta.
