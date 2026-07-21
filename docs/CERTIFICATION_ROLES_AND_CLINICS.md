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
| API-10 | Backend/API | Admin clínica | A | Edición de cita | Rechazar IDs de B | 400 | Validado | Prueba serializer |
| API-11 | Backend/API | Paciente | A | Recursos propios | Ver solo propios | Filtrado por usuario | Validado | Aprobado | Suites clínicas |
| API-12 | Backend/API | Paciente | A | Consulta/receta/orden | Intentar anular | 403 | 403 | Aprobado | Suite medical_records/prescriptions |
| API-13 | Backend/API | Superadmin | Global | Pacientes/citas | No obtener detalle identificable | Vacío/403/404 | Validado | Corregido | Pruebas patients/appointments |
| API-14 | Backend/API | Superadmin | Global | Expedientes/consultas | No obtener contenido clínico | 403/404/vacío | 403/404/vacío | Aprobado | Suite medical_records |
| API-15 | Backend/API | Superadmin | Global | Recetas/órdenes/hospitalización/documentos | Bloquear contenido clínico | 403/404/vacío | 403/404/vacío | Aprobado | Suites clínicas |
| API-16 | Backend/API | Superadmin | Global | Usuarios/perfiles médicos | Ver solo administradores | Personal clínico excluido | Validado | Aprobado | Suite accounts/doctors |
| WEB-01 | Web | Todos | A/B | Build producción | Compilar sin errores | Build completado | Aprobado | Vite: 1848 módulos |
| WEB-02 | Web | Superadmin | Global | `/users`, `/roles`, `/clinics` | Acceso permitido | Guard central aplicado | Pendiente | Requiere navegador |
| WEB-03 | Web | Rol clínico | A | URL administrativa manual | Redirigir a forbidden | Guard central aplicado | Pendiente | Requiere navegador |
| WEB-04 | Web | Recepción/Caja/Enfermería | A | Menú y dashboard | Mostrar experiencia del rol | Matriz aplicada | Pendiente | Requiere navegador |
| WEB-05 | Web | Todos | A/B | 401/403/logout | Refresh único; 403 no cierra sesión | Implementado y compilado | Pendiente | Requiere navegador |
| MOB-01 | Móvil | Todos | A/B | TypeScript | Sin errores | Sin errores | Aprobado | `npx tsc --noEmit` |
| MOB-02 | Móvil | Todos | A/B | Expo Doctor | Proyecto compatible | 18/18 | Aprobado | `npx expo-doctor` |
| MOB-03 | Móvil | Todos | A/B | Login y navegador por rol | Stack correcto | Código validado | Pendiente de prueba física | Expo Go requerido |
| MOB-04 | Móvil | Todos | A/B | Logout y botón atrás | No recuperar sesión | Limpieza garantizada | Pendiente de prueba física | Expo Go requerido |
| MOB-05 | Móvil | Todos | A/B | Cambio entre usuarios | Sin caché cruzada | Cache por sesión y limpieza | Pendiente de prueba física | Expo Go requerido |
| PROD-01 | Producción | Todos | A/B | `https://kp-software.tech` | Despliegue y smoke tests | Pendiente | Pendiente | `PRODUCTION_TEST_EVIDENCE.md` |

## Estado provisional

- Backend dirigido: 136/136 aprobado; ronda clínica afectada: 32/32 aprobada.
- Suite completa final: 249/249 pruebas aprobadas con cuatro bases de prueba aisladas.
- Django `check`: aprobado, sin cambios de migración.
- Web build: aprobado; lint con 0 errores y 62 advertencias heredadas.
- Web `npm audit`: 0 vulnerabilidades.
- Móvil: TypeScript y lint aprobados; Expo Doctor 18/18.
- Móvil `npm audit`: 15 avisos moderados transitivos de Expo SDK 54; resolverlos exige actualización mayor a SDK 57 y queda fuera de este sprint.
- Producción y Android físico no se consideran aprobados hasta ejecutar sus pasos.
