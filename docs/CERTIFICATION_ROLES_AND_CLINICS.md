# Sprint 1.0 - Certificación base por roles y clínicas

Fecha: 2026-07-21

Clínicas automatizadas: Clínica A y Clínica B, creadas dentro de bases temporales. Usuarios: correos sintéticos `@medicore.test` para superadmin, admin, recepción, caja, enfermería, médico y paciente. No se incluyen contraseñas.

| ID | Plataforma | Rol | Clínica | Pantalla o endpoint | Acción | Resultado esperado | Resultado real | Estado | Evidencia |
| -- | ---------- | --- | ------- | ------------------- | ------ | ------------------ | -------------- | ------ | --------- |
| API-01 | Backend/API | Todos | A/B | `/api/auth/login/` | Login correcto | Token, usuario y sesión | Validado por pruebas | Aprobado | `apps/accounts/tests.py` |
| API-02 | Backend/API | Todos | A/B | `/api/auth/login/` | Credenciales inválidas | 401 sin datos sensibles | 401 | Aprobado | Suite accounts/security |
| API-03 | Backend/API | Usuario inactivo | A | Login | Rechazar acceso | 401 | Aprobado | Test de regresión |
| API-04 | Backend/API | Usuario de clínica inactiva | A | Login/refresh | Rechazar y revocar | Rechazado | Aprobado | Suite accounts/security |
| API-05 | Backend/API | Todos | A/B | `/api/auth/refresh/` | Renovar con sesión activa | Nuevo access | Validado | Aprobado | `apps/security/tests.py` |
| API-06 | Backend/API | Todos | A/B | `/api/auth/logout/` | Revocar sesión | 204 | Validado | Aprobado | `apps/security/tests.py` |
| API-07 | Backend/API | Todos | A/B | Refresh tras logout | Rechazar reutilización | 401 | Validado | Aprobado | `apps/security/tests.py` |
| API-08 | Backend/API | Admin clínica | A | Pacientes, citas, admisiones | Consultar solo A | B no aparece | Validado | Aprobado | 136 pruebas dirigidas |
| API-09 | Backend/API | Admin clínica | A | Documentos y facturas de B | Bloquear detalle/descarga | 404 | Validado | Aprobado | Pruebas documents/billing |
| API-10 | Backend/API | Admin clínica | A | Edición de cita | Rechazar IDs de B | 400 | Validado | Aprobado | Prueba serializer |
| API-11 | Backend/API | Paciente | A | Recursos propios | Ver solo propios | Filtrado por usuario | Validado | Aprobado | Suites clínicas |
| API-12 | Backend/API | Paciente | A | Consulta/receta/orden | Intentar anular | 403 | 403 | Aprobado | Suite medical_records/prescriptions |
| API-13 | Backend/API | Superadmin | Global | Pacientes/citas | No obtener detalle identificable | Vacío/403/404 | Validado | Aprobado | Pruebas patients/appointments |
| API-14 | Backend/API | Superadmin | Global | Expedientes/consultas | No obtener contenido clínico | 403/404/vacío | Validado | Aprobado | Suite medical_records |
| API-15 | Backend/API | Superadmin | Global | Recetas/órdenes/hospitalización/documentos | Bloquear contenido clínico | 403/404/vacío | Validado | Aprobado | Suites clínicas |
| API-16 | Backend/API | Superadmin | Global | Usuarios/perfiles médicos | Ver solo administradores | Personal clínico excluido | Validado | Aprobado | Suite accounts/doctors |
| WEB-01 | Web | Todos | A/B | Build producción | Compilar sin errores | Build completado | Aprobado | Vite: 1848 módulos |
| WEB-02 | Web | Admin clínica | A | Dashboard | Login, datos y recarga protegida | Carga correcta | Aprobado | Navegador en producción |
| WEB-03 | Web | Rol clínico | A | `/users` manual | Redirigir a forbidden | `/forbidden` | Aprobado | Navegador en producción |
| WEB-04 | Web | Todos | A/B | Logout y acceso posterior | Volver a login | Ruta protegida redirigió a login | Aprobado | Navegador en producción |
| WEB-05 | Web | Todos | A/B | Vista 390 x 844 | Sin contenido roto | Sin desbordamiento horizontal | Aprobado | Navegador en producción |
| MOB-01 | Móvil | Todos | A/B | TypeScript | Sin errores | Sin errores | Aprobado | `npx tsc --noEmit` |
| MOB-02 | Móvil | Todos | A/B | Expo Doctor | Proyecto compatible | 18/18 | Aprobado | `npx expo-doctor` |
| MOB-03 | Móvil | Todos | A/B | Login y navegador por rol | Stack correcto | Código validado | Pendiente de prueba física | Expo Go requerido |
| MOB-04 | Móvil | Todos | A/B | Logout y botón atrás | No recuperar sesión | Limpieza garantizada | Pendiente de prueba física | Expo Go requerido |
| MOB-05 | Móvil | Todos | A/B | Cambio entre usuarios | Sin caché cruzada | Caché por sesión y limpieza | Pendiente de prueba física | Expo Go requerido |
| PROD-01 | Producción | Todos | A/B | `https://kp-software.tech` | Despliegue y smoke tests | Desplegado y validado | Aprobado | `PRODUCTION_TEST_EVIDENCE.md` |

## Resultado

- Suite completa final: 249/249 pruebas aprobadas con cuatro bases de prueba aisladas.
- Django `check`: aprobado y sin cambios de migración pendientes.
- Web: build aprobado; lint con 0 errores y 62 advertencias heredadas; `npm audit` sin vulnerabilidades.
- Móvil: TypeScript, lint y Expo Doctor 18/18 aprobados.
- Móvil `npm audit`: 15 avisos moderados transitivos de Expo SDK 54; corregirlos exige actualizar a SDK 57 y queda fuera de este sprint.
- Producción: servicios activos, HTTPS operativo, aislamiento entre dos clínicas, sesión y permisos comprobados.
- Único control abierto: recorrido físico en Android mediante Expo Go.
