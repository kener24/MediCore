# Auditoria App Paciente - MediCore

Fecha: 2026-06-22

## Resumen

El modulo paciente ya existe y esta bastante avanzado. No se detectaron pantallas duplicadas ni servicios duplicados dentro de `src/features/patient`. La app usa servicios reales bajo `/api/patient-portal/...` y el backend ya cuenta con vistas dedicadas en `apps.patient_portal`.

Correcciones aplicadas en este sprint:

- Se agrego `isPatientRole(role)` en mobile.
- Se acepto rol `patient` y `paciente` para enrutar al portal paciente.
- Se evito que el rol `patient` pueda caer accidentalmente en flujo de caja.
- Se corrigieron mensajes corruptos de `RoleGuard`.
- Se ajusto backend para permitir portal paciente con rol `patient` o `paciente`.

## Inventario real

| Modulo | Pantalla/archivo | Existe | Funciona | API real | Usa mock | Problema | Accion recomendada |
|---|---|---:|---|---:|---:|---|---|
| Dashboard paciente | `src/features/patient/screens/PatientDashboardScreen.tsx` | Si | funcional | Si | No | Depende de `/patient-portal/dashboard/`. | Mantener; probar con paciente real. |
| Perfil paciente | `src/features/patient/screens/PatientProfileScreen.tsx` | Si | funcional | Si | No | Textos previamente tenian codificacion visual inconsistente en algunos mensajes. | Mantener; validar datos completos desde backend. |
| Editar perfil | `src/features/patient/screens/EditPatientProfileScreen.tsx` | Si | funcional | Si | No | Solo permite contacto; correcto. | Mantener; probar PATCH con paciente real. |
| Seguridad/configuracion | `src/features/patient/screens/SettingsScreen.tsx` | Si | funcional | Parcial | No | Usa acciones locales y navegacion. | Mantener; agregar mas opciones solo si backend las soporta. |
| Cambiar contrasena | `src/features/patient/screens/ChangePasswordScreen.tsx` | Si | funcional | Si | No | Depende de `/auth/change-password/`. | Probar con usuario paciente real. |
| Citas del paciente | `src/features/patient/screens/PatientAppointmentsScreen.tsx` | Si | funcional | Si | No | Depende de `/patient-portal/appointments/`. | Mantener. |
| Solicitar cita | `src/features/patient/screens/RequestAppointmentScreen.tsx` | Si | funcional | Si | No | Respeta modalidad online/presencial desde backend. | Mantener; probar online deshabilitado y presencial. |
| Detalle de cita | `src/features/patient/screens/PatientAppointmentDetailScreen.tsx` | Si | funcional | Si | No | Depende de detalle `/patient-portal/appointments/{id}/`. | Mantener. |
| Cancelar cita | `CancelAppointmentModal` + detalle/listado | Si | funcional | Si | No | Depende de configuracion de clinica. | Probar limites de cancelacion. |
| Historial clinico | Endpoint backend `medical-record-summary` | Parcial | pendiente web/app | Si | No | No hay pantalla dedicada en tabs paciente. | Crear/integrar pantalla en siguiente sprint sin duplicar secciones. |
| Recetas | `PatientPrescriptionsScreen` y detalle | Si | funcional | Si | No | Respeta endpoint de portal. | Mantener; validar permiso backend. |
| Ordenes medicas | Endpoint existe, pantalla no dedicada | Parcial | pendiente app | Si | No | `medicalOrders` esta en endpoints pero no se encontro pantalla dedicada. | Integrar en proximo sprint si es prioridad. |
| Documentos/resultados | `PatientDocumentsScreen` y detalle | Si | funcional | Si | No | Abre preview/download por URL. | Probar documentos visibles al paciente. |
| Facturas | `PatientInvoicesScreen` y detalle | Si | funcional | Si | No | El servicio conserva funciones internas de PDF no usadas. | No usar rutas internas desde paciente sin endpoint portal. |
| Pagos | Endpoint y tipos existen | Parcial | pendiente app | Si | No | No hay pantalla dedicada de pagos. | Mostrar pagos dentro de detalle o crear pantalla si se requiere. |
| Notificaciones | `PatientNotificationsScreen` | Si | funcional | Si | No | Lista usa portal; mark-read usa endpoint global filtrado por usuario. | Considerar endpoint portal mark-read si se quiere aislar 100%. |
| Logout | `SettingsScreen` + AuthContext | Si | funcional | Local/API opcional | No | Logout local continua si backend falla. | Mantener. |
| Navegacion por rol | `RoleNavigator`, `PatientTabs`, `RoleGuard` | Si | corregido | N/A | No | No aceptaba rol `patient`. | Corregido. |

## Datos mock o decorativos

No se encontraron datos mock productivos en `src/features/patient` con los patrones: `mock`, `fake`, `demo`, `dummy`, `sample`, `hardcoded`, `ejemplo`, `prueba`.

Hay empty states y mensajes de fallback cuando no hay informacion. Eso es correcto para produccion.

## Backend revisado

Existe `apps.patient_portal` con endpoints dedicados para dashboard, perfil, citas, recetas, ordenes, facturas, pagos, documentos, notificaciones y clinica.

Correccion backend aplicada:

- `PatientPortalBaseView` ahora acepta rol `paciente` o `patient`.

## Web revisada

No se modifico web en este sprint. No fue necesario para las correcciones realizadas.

