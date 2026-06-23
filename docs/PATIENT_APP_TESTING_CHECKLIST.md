# Checklist de Pruebas App Paciente - MediCore

Fecha: 2026-06-22

## Mobile Android fisico

| Prueba | Estado |
|---|---|
| Login paciente con rol `paciente` | pendiente Android fisico |
| Login paciente con rol `patient` | pendiente Android fisico |
| Redireccion a `PatientTabs` | pendiente Android fisico |
| Bloqueo de paciente en modulos medico/admin/caja | pendiente Android fisico |
| Dashboard con datos reales | pendiente Android fisico |
| Dashboard sin datos | pendiente Android fisico |
| Perfil real | pendiente Android fisico |
| Editar telefono/direccion/correo | pendiente Android fisico |
| Cambio de contrasena | pendiente Android fisico |
| Logout y limpieza de sesion | pendiente Android fisico |
| Listado de citas propias | pendiente Android fisico |
| Solicitar cita presencial | pendiente Android fisico |
| Solicitar cita online con online habilitado | pendiente Android fisico |
| Solicitar cita online con online deshabilitado | pendiente Android fisico |
| Cancelar cita permitida | pendiente Android fisico |
| Cancelar cita fuera de limite | pendiente Android fisico |
| Recetas | pendiente Android fisico |
| Documentos/preview/download | pendiente Android fisico |
| Facturas | pendiente Android fisico |
| Notificaciones y marcar leida | pendiente Android fisico |
| Sin internet | pendiente Android fisico |
| 401 token vencido | pendiente Android fisico |
| 403 portal deshabilitado | pendiente Android fisico |
| Campos null/vacios | pendiente Android fisico |
| Tildes y textos largos | pendiente Android fisico |
| Tab bar no tapa botones | pendiente Android fisico |
| Teclado no tapa inputs | pendiente Android fisico |

## Comandos locales

| Comando | Resultado esperado |
|---|---|
| `npx tsc --noEmit` | Sin errores TypeScript |
| `npx expo-doctor` | Sin errores criticos |
| `python manage.py check` | Sin errores Django si backend fue tocado |

