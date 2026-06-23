# Roadmap App Paciente - MediCore

Fecha: 2026-06-22

## Estado actual

El modulo paciente ya esta implementado en su base: login, dashboard, perfil, edicion de contacto, configuracion, cambio de contrasena, citas, solicitud/cancelacion de citas, recetas, documentos, facturas y notificaciones.

## Correcciones cerradas en este sprint

- Aceptar rol `patient` como paciente.
- Evitar que `patient` pueda resolver como caja por permisos.
- Mantener `paciente` como rol interno de app.
- Permitir backend patient portal para rol `patient`.
- Documentar inventario, APIs, permisos y checklist.

## Siguiente sprint recomendado

| Prioridad | Trabajo | Motivo |
|---|---|---|
| Alta | Pantalla de historial clinico del paciente | Backend ya tiene `/patient-portal/medical-record-summary/`, falta UI dedicada. |
| Alta | Pantalla o seccion de ordenes medicas | Endpoint existe, falta experiencia completa en mobile. |
| Media | Pagos del paciente | Endpoint existe, falta pantalla o seccion dedicada. |
| Media | PDF fiscal paciente por endpoint portal | Evita exponer rutas internas de billing. |
| Media | Endpoint portal para marcar notificaciones leidas | Aisla reglas de paciente. |
| Baja | Pantalla de configuracion visible de paciente | Hoy se cubre con dashboard/clinic-info. |

## Criterios para no duplicar

- Extender `src/features/patient/services/*` existentes.
- Reutilizar componentes existentes como `PatientHeader`, `DashboardSection`, `AppCard`, `AppButton`, `ErrorState`, `EmptyState`.
- No crear otro dashboard, otra pantalla de perfil ni otro servicio HTTP.
- No crear endpoints nuevos si `/patient-portal/...` ya cubre la necesidad.

