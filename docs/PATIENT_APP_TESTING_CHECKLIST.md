# Checklist de Pruebas App Paciente - MediCore

Fecha: 2026-06-25

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
| Historial clinico | pendiente Android fisico |
| Ordenes medicas y detalle | pendiente Android fisico |
| Documentos/preview/download | pendiente Android fisico |
| Facturas | pendiente Android fisico |
| PDF fiscal desde portal paciente | pendiente Android fisico |
| Pagos y detalle de pago | pendiente Android fisico |
| Notificaciones, marcar leida y marcar todas leidas | pendiente Android fisico |
| Configuracion visible del portal | pendiente Android fisico |
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
| `npx tsc --noEmit` | OK, sin errores TypeScript |
| `npx expo-doctor` | OK, 18/18 checks passed |
| `python manage.py check` | OK, sin errores Django |
| `python manage.py test apps.notifications apps.documents` | OK, 15/15 pruebas pasaron |

## Produccion

| Prueba | Estado |
|---|---|
| Deploy backend en `/var/www/medicore` | OK |
| `git pull --ff-only origin main` | OK |
| `python manage.py migrate` | OK, aplicada migracion `hospitalization.0002` que estaba pendiente en servidor |
| `python manage.py check` | OK, con warnings conocidos de MySQL por constraints condicionales |
| `python manage.py collectstatic --noinput` | OK |
| Reinicio `medicore.service` | OK |
| Reinicio `nginx.service` | OK |
| GET `/api/patient-portal/profile/` sin token | OK, devuelve 401 |
| Login paciente demo | OK |
| GET `/api/patient-portal/profile/` con token paciente | OK, devuelve paciente `PAC-000001` |
