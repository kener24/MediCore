# Evidencia de pruebas en producción

Fecha: 2026-07-21

Resultados ejecutados contra `https://kp-software.tech`. Este documento no contiene contraseñas, tokens, identificaciones ni datos clínicos sensibles.

| ID | Prueba | Resultado | Evidencia segura |
| --- | --- | --- | --- |
| PROD-01 | Respaldo/estado previo del servidor | Aprobado | Backup MySQL verificado y copia del estado previo en `/var/www/medicore/backups/sprint10-20260721-180946` |
| PROD-02 | `git pull` y versión desplegada | Aprobado | Commit funcional desplegado: `34eebe1` |
| PROD-03 | Migraciones y `manage.py check` | Aprobado | Migraciones aplicadas; `manage.py check` sin errores |
| PROD-04 | Build web de producción | Aprobado | Vite compiló; assets `index-C0mCxDpb.js` e `index-B922Lycc.css` |
| PROD-05 | Reinicio Gunicorn y estado activo | Aprobado | `medicore.service=active` |
| PROD-06 | `nginx -t` y recarga | Aprobado | Configuración válida; `nginx=active` |
| PROD-07 | HTTPS y pantalla de login | Aprobado | `https://kp-software.tech/login` respondió 200 y cargó en navegador |
| PROD-08 | Login de Clínica A | Aprobado | Sesión admin asociada a Clínica A; 12 pacientes visibles |
| PROD-09 | Login de Clínica B | Aprobado | Sesión admin asociada a Clínica B; 12 pacientes visibles |
| PROD-10 | Recurso propio visible | Aprobado | Listados propios respondieron 200 bajo sesión válida |
| PROD-11 | Recurso de otra clínica bloqueado | Aprobado | Paciente real de Clínica B consultado desde Clínica A respondió 404 |
| PROD-12 | Ruta web no autorizada | Aprobado | Admin clínica enviado de `/users` a `/forbidden` |
| PROD-13 | Logout y reutilización bloqueada | Aprobado | Logout 204; acceso y refresh posteriores respondieron 401 |
| PROD-14 | Restricciones de superadmin | Aprobado | Pacientes 403; médicos vacíos; usuarios limitados a admin/superadmin |
| PROD-15 | Restricciones de recepción | Aprobado | Consulta genérica de usuarios respondió 403 |
| PROD-16 | Refresh válido y credenciales inválidas | Aprobado | Refresh activo 200; contraseña incorrecta 401 |
| PROD-17 | Navegador de escritorio | Aprobado | Dashboard real, recarga protegida, 403 y logout comprobados |
| PROD-18 | Navegador móvil 390 x 844 | Aprobado | Login completo y sin desbordamiento horizontal |
| PROD-19 | Inicio de Expo contra API HTTPS | Aprobado | Metro activo en puerto 8081; API predeterminada `https://kp-software.tech/api/` |
| PROD-20 | Flujo en Android físico | Pendiente de prueba física | Requiere abrir `exp://192.168.101.27:8081` con Expo Go en la misma red |
| PROD-21 | Login por rol en dos clínicas | Aprobado | Admin, recepción/caja, enfermería, médico y paciente validaron login, `/auth/me/` y logout en A y B |

## Sprint 1.1: recepción, citas y admisiones

Despliegue y pruebas ejecutados el 2026-07-22 contra `https://kp-software.tech` con datos sintéticos no sensibles.

| ID | Prueba | Resultado | Evidencia segura |
| --- | --- | --- | --- |
| REC-LOCAL-01 | Suite dirigida de recepción | Aprobado | 56/56 pruebas |
| REC-LOCAL-02 | Suite completa Django | Aprobado | 264/264 pruebas en 421.672 s |
| REC-LOCAL-03 | Django system check | Aprobado | Sin errores ni advertencias silenciadas |
| REC-LOCAL-04 | Coherencia de migraciones | Aprobado | `makemigrations --check --dry-run`: sin cambios pendientes |
| REC-LOCAL-05 | Build web | Aprobado | Vite produjo assets de producción |
| REC-LOCAL-06 | Lint web | Aprobado con observaciones | 0 errores; 62 advertencias heredadas después de retirar la advertencia nueva |
| REC-LOCAL-07 | TypeScript móvil | Aprobado | `npx tsc --noEmit` sin errores |
| REC-LOCAL-08 | Lint móvil | Aprobado | `expo lint` sin errores |
| REC-LOCAL-09 | Expo Doctor | Aprobado | 18/18 verificaciones |
| REC-LOCAL-10 | Auditoría npm web | Aprobado | 0 vulnerabilidades de producción |
| REC-LOCAL-11 | Auditoría npm móvil | Riesgo aceptado temporalmente | 15 moderadas transitivas; la corrección automática fuerza Expo 57 y requiere un sprint de actualización del SDK |
| REC-LOCAL-12 | Inicio de Expo y bundle Android | Aprobado | Metro inició con caché limpia en 8081; manifest 200 y bundle Android 200 con 1,501 módulos |
| REC-PROD-01 | Respaldo previo | Aprobado | Dump MySQL final verificado en `backups/sprint11-final-20260723-043105/database.sql` |
| REC-PROD-02 | Despliegue Sprint 1.1 | Aprobado | Commit `8d056c7`; migración `admissions.0003` aplicada; MediCore y Nginx activos |
| REC-PROD-03 | Build web y HTTPS | Aprobado | Vite compiló en servidor; `nginx -t` válido y recarga correcta |
| REC-PROD-04 | Búsqueda y agenda Clínica A | Aprobado | Recursos propios 200 y paciente sintético encontrado únicamente en su clínica |
| REC-PROD-05 | Check-in Clínica A | Aprobado | Primera llamada 201, reintento por endpoint alterno 200, misma visita y cola `waiting_triage` |
| REC-PROD-06 | Búsqueda y agenda Clínica B | Aprobado | Recursos propios 200 y paciente sintético encontrado únicamente en su clínica |
| REC-PROD-07 | Check-in Clínica B | Aprobado | Primera llamada 201, reintento por endpoint alterno 200, misma visita y cola `waiting_triage` |
| REC-PROD-08 | Triaje obligatorio | Aprobado | Envío directo a médico respondió 400 en ambas clínicas configuradas con triaje obligatorio |
| REC-PROD-09 | Cita, visita y check-in cruzados | Aprobado | Recepción A recibió 404 al usar IDs de Clínica B |
| REC-PROD-10 | Búsqueda cruzada | Aprobado | Búsqueda exacta del paciente B desde Clínica A respondió lista vacía |
| REC-PROD-11 | Paciente y médico cruzados | Aprobado | Creación de admisión respondió 400 sin crear registros |
| REC-PROD-12 | Posible paciente duplicado | Aprobado | Coincidencia probable respondió 400; confirmación explícita respondió 201; identidad exacta siguió bloqueada y se creó una sola auditoría |
| REC-LOCAL-13 | Regresión tras revisión visual | Aprobado | 105/105 pruebas de citas, admisiones, pacientes, cuentas y auditoría; prueba específica del contrato web aprobada |
| REC-PROD-13 | Respaldo de reanudación | Aprobado | Dump MySQL verificado en `backups/sprint11-resume-20260723-052332/database.sql` y commit previo registrado |
| REC-PROD-14 | Despliegue de corrección visual | Aprobado | Commit `850d7c5`; sin migraciones pendientes; MediCore y Nginx activos |
| REC-PROD-15 | Navegación web de recepción | Aprobado | Menú operativo, pacientes, admisiones, nueva atención y citas cargaron bajo el rol recepcionista |
| REC-PROD-16 | Datos de agenda y detalle | Aprobado | Agenda mostró paciente, código, médico y especialidad; detalle abrió la visita vinculada en `waiting_triage` |
| REC-PHYSICAL-01 | Android físico | Pendiente | No se marca aprobado por inferencia; requiere prueba manual con Expo Go |

## Sprint 1.2: enfermería y triaje

Despliegue y pruebas ejecutados el 2026-07-24 contra `https://kp-software.tech` con pacientes y visitas sintéticos.

| ID | Prueba | Resultado | Evidencia segura |
| --- | --- | --- | --- |
| TRI-LOCAL-01 | Pruebas específicas de triaje | Aprobado | 16/16 pruebas |
| TRI-LOCAL-02 | Suite clínica dirigida | Aprobado | 105/105 pruebas de admisiones, expedientes, pacientes, cuentas y auditoría |
| TRI-LOCAL-03 | Suite completa Django | Aprobado | 274/274 pruebas en 422.294 s |
| TRI-LOCAL-04 | Build y lint web | Aprobado con observaciones | Build Vite correcto; lint con 0 errores y 62 advertencias heredadas |
| TRI-LOCAL-05 | Calidad móvil | Aprobado | TypeScript y lint sin errores; Expo Doctor 18/18 |
| TRI-PROD-01 | Respaldo previo | Aprobado | Respaldo verificable en `backups/sprint12-20260723-063959` |
| TRI-PROD-02 | Despliegue de flujo clínico | Aprobado | Commits `c202fff`, `eb607f1` y `4220f5b`; sin migraciones nuevas |
| TRI-PROD-03 | Triaje completo en Clínica A | Aprobado | Recepción, cola, toma, signos, IMC, evaluación, prioridad y finalización comprobados |
| TRI-PROD-04 | Triaje completo en Clínica B | Aprobado | Flujo equivalente comprobado de forma independiente |
| TRI-PROD-05 | Aislamiento multiclínica | Aprobado | Acceso cruzado a detalle, signos, inicio y finalización respondió 404 |
| TRI-PROD-06 | Idempotencia | Aprobado | Reintento de finalización no duplicó transición, auditoría ni datos |
| TRI-PROD-07 | Sala médica | Aprobado | El médico asignado recibió evaluación inicial y signos vitales tras el triaje |
| TRI-PROD-08 | Selección de médico en recepción | Aprobado | Recepción lista únicamente médicos activos de su clínica |
| TRI-PROD-09 | Detalle web para enfermería | Aprobado | Commit `e0c00ed`; detalle completado abre en Triaje, conserva la ruta y no genera errores de consola |
| TRI-PROD-10 | Servicios de producción | Aprobado | Revisión `e0c00ed`; Nginx y MediCore activos; `nginx -t` válido |
| TRI-PHYSICAL-01 | Android físico | Pendiente | Requiere completar el flujo manualmente desde Expo Go; no se infiere desde compilación |

## Observaciones de despliegue

- MySQL advirtió que no aplica siete restricciones únicas condicionales de Django. No bloqueó el despliegue, pero deben mantenerse cubiertas por validación transaccional y pruebas.
- El build web conserva una advertencia de tamaño de chunk; no afecta la ejecución.
- Android físico no se marca como aprobado por inferencia.
- Caja comparte actualmente el rol de recepción; no existe un usuario de caja separado por decisión funcional del proyecto.

## Sprint 1.3A: consulta médica, contexto clínico y autosave

Despliegue y pruebas ejecutados el 2026-07-24 contra `https://kp-software.tech` con visitas y contenido clínico sintéticos.

| ID | Prueba | Resultado | Evidencia segura |
| --- | --- | --- | --- |
| DOC-LOCAL-01 | Suite completa Django | Aprobado | 283/283 pruebas en 878.952 s |
| DOC-LOCAL-02 | Regresión de admisiones y flujo médico | Aprobado | 41/41 pruebas después de centralizar la transición de visita |
| DOC-LOCAL-03 | Auditoría de acceso fuera de alcance | Aprobado | 10/10 pruebas después del ajuste final |
| DOC-LOCAL-04 | Django y migraciones | Aprobado | `manage.py check` correcto y `makemigrations --check` sin cambios pendientes |
| DOC-LOCAL-05 | Web | Aprobado con observaciones | Build Vite correcto; lint con 0 errores y 62 advertencias heredadas |
| DOC-LOCAL-06 | Móvil | Aprobado | TypeScript y lint sin errores; Expo Doctor 18/18 |
| DOC-LOCAL-07 | Bundle Android | Aprobado | Export Android completo con 1,510 módulos y bundle Hermes |
| DOC-LOCAL-08 | Expo en LAN | Aprobado | Metro activo en 8081; manifest Android 200 y bundle 200 desde `192.168.101.27` |
| DOC-PROD-01 | Respaldo previo | Aprobado | Dump MySQL y bundle Git verificados por SHA-256 en `backups/sprint13a-final-20260724-181559` |
| DOC-PROD-02 | Compatibilidad de migración | Aprobado | Cero visitas con consultas duplicadas antes de crear la restricción única |
| DOC-PROD-03 | Despliegue | Aprobado | Revisión final `1c131f1`; migración `medical_records.0004` aplicada; MediCore y Nginx activos |
| DOC-PROD-04 | Clínica A | Aprobado | Sala, inicio, reintento idempotente, contexto, borrador, conflicto, finalización y solo lectura |
| DOC-PROD-05 | Clínica B | Aprobado | Flujo equivalente ejecutado de forma independiente |
| DOC-PROD-06 | Conflicto de versión | Aprobado | Cliente obsoleto recibió HTTP 409 y no sobrescribió la consulta |
| DOC-PROD-07 | Finalización idempotente | Aprobado | Segundo intento devolvió la consulta existente sin repetir transición |
| DOC-PROD-08 | Edición posterior | Aprobado | PATCH de consulta finalizada respondió HTTP 409 |
| DOC-PROD-09 | Aislamiento A/B | Aprobado | Contexto y edición cruzados devolvieron HTTP 404 en ambas direcciones |
| DOC-PROD-10 | Auditoría cruzada | Aprobado | Intento A→B generó un único evento `permission_denied` sin contenido clínico externo |
| DOC-PROD-11 | Revisión visual web | Aprobado | Contexto y triaje integrados, formulario deshabilitado y consola sin errores |
| DOC-PROD-12 | HTTPS y sesión | Aprobado | Login 200, API anónima 401 y flujo autenticado por HTTPS |
| DOC-PHYSICAL-01 | Android físico | Pendiente | Requiere ejecutar el recorrido manual en Expo Go; no se infiere desde el bundle |

### Riesgo residual de dependencias

- `react-router-dom` se actualizó a 7.18.1, última versión publicada durante la certificación.
- npm conserva dos alertas altas asociadas al modo React Server Components. MediCore web es una SPA Vite y no habilita RSC, por lo que la ruta afectada no está expuesta en esta arquitectura.
- No existía una versión corregida publicada al cierre del sprint. Debe actualizarse cuando el proveedor libere el parche y repetirse build, lint, auditoría y navegación.

## Política de evidencia

- Las evidencias no muestran tokens, contraseñas ni información clínica real.
- Una prueba pendiente no se marca como aprobada sin ejecución directa.
- Los accesos utilizados son de demostración y no quedan guardados en este documento.

## Sprint 1.3B: certificación local previa al despliegue

Fecha: 2026-07-25

| ID | Prueba | Resultado | Evidencia segura |
| --- | --- | --- | --- |
| RX-LOCAL-01 | Recetas, órdenes, consumos y documentos | Aprobado | 40/40 pruebas enfocadas después del aislamiento adicional de adjuntos |
| RX-LOCAL-02 | Cuentas | Aprobado | 37/37 pruebas |
| RX-LOCAL-03 | Seguridad, auditoría y notificaciones | Aprobado | 37/37 pruebas |
| RX-LOCAL-04 | Operación clínica | Aprobado | 113/113 pruebas |
| RX-LOCAL-05 | Facturación, inventario, compras y reportes | Aprobado | 71/71 pruebas |
| RX-LOCAL-06 | Suite Django total por grupos | Aprobado | 298/298 pruebas sin solapamiento |
| RX-LOCAL-07 | Django y migraciones | Aprobado | `check` sin errores; `makemigrations --check --dry-run` sin cambios pendientes |
| RX-LOCAL-08 | Web | Aprobado con observaciones | Build correcto; lint sin errores, con advertencias heredadas pendientes |
| RX-LOCAL-09 | Móvil | Aprobado | TypeScript y lint sin errores; Expo Doctor 18/18 |
| RX-PHYSICAL-01 | Android físico | Pendiente | Debe ejecutarse manualmente en Expo Go; no se infiere desde TypeScript o Metro |

La evidencia de despliegue, migraciones MySQL, servicios, pruebas A/B y HTTPS se agrega después de actualizar producción. No se incluyen contraseñas, tokens ni contenido clínico.
