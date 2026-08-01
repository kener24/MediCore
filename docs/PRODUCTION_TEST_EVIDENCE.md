# Evidencia de certificación Sprint 1.6B

Fecha de validación: 2026-07-29 local / 2026-07-30 UTC.

## Resultados locales

- Migraciones MySQL: aplicadas correctamente hasta `hospitalization.0006`.
- `python manage.py makemigrations --check`: sin cambios pendientes.
- `python manage.py check`: sin errores.
- Pruebas hospitalarias iniciales: 15 de 15 aprobadas.
- Suite completa: 346 pruebas aprobadas y 3 omitidas de forma prevista, sin fallos.
- Lint web: cero errores; permanecen advertencias históricas fuera del alcance.
- Build web de producción: aprobado.
- TypeScript móvil: aprobado.
- Expo Doctor: 18 de 18 comprobaciones aprobadas.
- Expo/Metro: iniciado con caché limpia en modo LAN y escuchando en el puerto 8081.
- Metro/Expo: iniciado correctamente en modo LAN y escuchando en el puerto 8081.

## Casos certificados

Se verificaron alergias con justificación médica, programación sin consumo, FEFO dividido, reintento idempotente, excepciones sin cargo, reversión al mismo lote, factura única, resumen firmado, alta segura, cama en limpieza, portal paciente y aislamiento entre clínicas.

## Producción

- Respaldo previo: `backups/sprint16b_20260730_055347` en el servidor.
- Dump MySQL comprimido: integridad validada con `gzip -t`.
- Bundle Git: historial completo validado con `git bundle verify`.
- Código web/backend desplegado: commit `1a97c11` en `main`.
- Código móvil publicado: commit `191873a` en `master`.
- Dependencias Python: instaladas y sin cambios pendientes.
- Migraciones: aplicadas sin error.
- Build Vite: aprobado en el servidor.
- Nginx: configuración válida y recargada.
- Gunicorn/Django: `medicore.service` activo, sin advertencias recientes en el journal.
- HTTPS: `/login` respondió 200.
- Seguridad: endpoint hospitalario sin sesión respondió 401.
- Enfermería: login, cola de medicamentos y contrato ampliado respondieron 200; identidad, cama, alergias, stock, dosis, vía, horario y estado estuvieron presentes.
- Médico: login y lista de internamientos activos respondieron 200.
- Paciente: login y resúmenes de egreso propios respondieron 200.
- Las sesiones utilizadas para las pruebas se cerraron al finalizar.
- Inspección visual web: detalle de internamiento, indicación de medicamento y flujo de alta cargaron correctamente, sin errores de consola ni superposiciones visibles.

## Advertencias controladas

- MySQL advierte sobre algunas restricciones condicionales históricas de otros módulos. La unicidad de horarios de medicamentos de este sprint se convirtió a una restricción compatible con MySQL y se validó que no existían duplicados antes de aplicarla.
- React Router quedó en `7.18.2`. `npm audit` conserva un aviso del modo RSC, pero MediCore es una SPA Vite con `createBrowserRouter` y no ejecuta acciones RSC/SSR. Migrar a React Router 8 requiere un sprint propio porque cambia paquete, React mínimo y Node mínimo.
- El build avisa que el paquete principal supera 500 kB. No afecta funcionamiento; la división de código queda como mejora de rendimiento posterior.

## Android físico

La validación estática y el inicio de Expo pueden certificarse desde el entorno de desarrollo. La interacción en un dispositivo Android físico requiere confirmación manual del usuario y no se declarará aprobada sin esa evidencia.

---

# Evidencia Sprint 1.7A - portal del paciente

Fecha local: 2026-07-30.

## Validación local

- `python manage.py check`: aprobado.
- Pruebas específicas del portal: 8 de 8 aprobadas.
- Pruebas ampliadas de portal, citas, documentos y cuentas: 75 de 75 aprobadas.
- Regresión de receta emitida y portal seguro: aprobada junto con las pruebas del sprint.
- Suite completa: 354 pruebas aprobadas y 3 omitidas de forma prevista, sin fallos.
- Build web de producción: aprobado.
- TypeScript móvil: aprobado.
- Expo Doctor: 18 de 18 comprobaciones aprobadas.

## Estado pendiente de evidencia

- Android físico requiere ejecución manual real; no se marca aprobado por validación estática.

## Producción Sprint 1.7A

- Respaldo previo: `backups/sprint17a_20260730_173253`.
- Dump MySQL generado con `--no-tablespaces`, validado con `gzip -t` y comprobación de estructura y datos.
- Bundle Git verificado y sumas SHA-256 registradas.
- Migración `appointments.0003` aplicada correctamente en MySQL.
- Django, Gunicorn, Nginx y MySQL activos; HTTPS `/login` respondió 200.
- Login paciente, dashboard, perfil, configuración, citas, recetas, órdenes, documentos y logout respondieron correctamente por HTTPS.
- Accesos cruzados a cita, receta, orden, documento y descarga ajenos devolvieron 404; perfil sin sesión devolvió 401.
- Solicitud repetida con la misma clave produjo una sola cita; reprogramación conservó el mismo registro; cancelación guardó motivo.
- La sesión de prueba se cerró y una sesión residual del intento interrumpido fue revocada.
- Inspección visual de dashboard, perfil y citas aprobada sin errores de consola.
- `npm audit --omit=dev` conserva dos avisos altos de React Router relacionados con el modo RSC; MediCore es SPA Vite y no utiliza RSC/SSR. La corrección ofrecida implica cambio incompatible y queda para un sprint de dependencias.

## Cierre multi-clínica Sprint 1.7A

- Se validaron tres pacientes demo independientes, pertenecientes a las clínicas 3, 4 y 5.
- Cada paciente obtuvo por HTTPS sus cinco citas, cinco recetas emitidas, cinco órdenes médicas, historial finalizado y un documento PDF visible.
- Listado, detalle y PDF de receta propia respondieron correctamente; el PDF usó `application/pdf`.
- Listado, detalle, descarga y vista previa de documento propio respondieron 200 con `application/pdf`.
- Se ejecutaron doce intentos cruzados entre los tres pacientes: receta, orden, documento y descarga ajenos. Todos devolvieron 404.
- Las respuestas públicas revisadas no expusieron `user_id`, `clinic_id`, paciente interno, clínica interna ni emisor administrativo.
- La auditoría registró login, vistas, descargas, denegaciones de permiso y logout para los casos ejecutados.
- Al finalizar quedaron cero sesiones activas para los tres usuarios de certificación.
- Antes de agregar los tres PDF ficticios se respaldó el módulo de documentos en `backups/20260730_patient_cert/documents_before.json`, con suma SHA-256.
- Los archivos agregados están identificados como datos demo sin validez clínica o legal y no modifican registros originales.

---

# Evidencia Sprint 1.7B - finanzas, notificaciones y sesión del paciente

Fecha: 2026-07-31.

## Validación local

- `python manage.py check`: aprobado.
- Pruebas dirigidas de portal, notificaciones y seguridad: 44 de 44 aprobadas.
- Suite completa: 359 pruebas aprobadas; 3 casos de concurrencia se omitieron localmente por usar SQLite.
- Los 3 casos omitidos aprobaron posteriormente contra una base temporal MySQL en producción.
- Build web Vite: aprobado; conserva advertencia no bloqueante por bundle mayor a 500 kB.
- TypeScript móvil: aprobado.
- Lint móvil: aprobado sin advertencias.
- Expo Doctor: 18 de 18 comprobaciones aprobadas.
- Exportación Android: aprobada, 1529 módulos y bundle Hermes generado.

## Respaldo y despliegue

- Respaldo previo: `backups/sprint17b_20260731T171543Z`.
- Dump válido: `mysql-no-tablespaces.sql.gz`, con `gzip -t`, cierre del dump y SHA-256 verificados.
- Bundle Git, `.env` protegido y parche del árbol remoto incluidos con sumas SHA-256.
- Backend/web ejecutable desplegado en `main`, commit `fc7ece1`.
- Aplicación móvil subida a `master`, commit `6a0db76`.
- Migración `notifications.0003` aplicada correctamente.
- Dependencias, build, estáticos, Nginx y servicios completados sin error.
- `medicore.service`, `medicore-notifications.timer` y Nginx quedaron activos.
- La tarea de notificaciones se ejecutó manualmente con resultado exitoso y continúa programada cada hora.

## Certificación HTTPS

- `/login` respondió 200 con certificado válido.
- Dashboard protegido sin sesión respondió 401.
- Tres pacientes demo iniciaron sesión, renovaron token y cerraron sesión correctamente.
- A1 obtuvo 6 facturas, 2 pagos, 1 nota de crédito y 31 notificaciones.
- A2 obtuvo 5 facturas, 5 pagos y 2 notificaciones.
- B1 obtuvo 5 facturas y 20 notificaciones; no tenía pagos ni notas de crédito demo.
- Detalles propios, PDF de factura, recibo y PDF de nota disponibles respondieron 200 con `application/pdf`.
- Marcar leída y marcar todas respondieron 200; el contador de A2 quedó en cero.
- Preferencias se consultaron y actualizaron con 200.
- Dispositivo push de prueba se registró con 201 sin exponer el token, el intento de otro paciente devolvió 409 y la revocación eliminó el dispositivo de activos.
- Los accesos cruzados disponibles a factura, PDF, pago, recibo, nota, notificación y sesión devolvieron 404.
- Los casos cruzados sin pago o nota de crédito en los datos demo se registraron como no ejecutables, no como aprobados.
- No aparecieron errores, excepciones ni trazas nuevas en el journal de Gunicorn.
- La inspección visual de facturas, pagos y notificaciones en producción cargó datos reales sin errores de consola.
- Estados financieros, tipos y prioridades de notificación quedaron localizados en español; un nuevo inicio de sesión generó y mostró correctamente su notificación.
- La validación Android se repitió sobre el commit final: Expo Doctor aprobó 18 de 18 comprobaciones y la exportación compiló 1529 módulos sin errores.

## Correo y tareas

- Producción usa SMTP de AWS SES en `us-east-2`, puerto 587 y TLS.
- El remitente configurado pertenece a `kp-software.tech`.
- No se realizó un envío a una dirección ficticia para evitar rebotes y proteger la reputación de SES.

## Evidencia pendiente

- La exportación Android y Expo Doctor no sustituyen una prueba en teléfono físico.
- Recepción push real, apertura desde push y comportamiento del proveedor requieren una compilación/dispositivo Android real.
- Estos puntos no se declaran certificados hasta recibir evidencia manual del dispositivo.

---

# Evidencia de pruebas y produccion

## Sprint 1.8A

Fecha local: 2026-07-31.

### Automatizacion local

- `python manage.py check`: aprobado, 0 errores.
- Certificacion admin clinica: 16 pruebas aprobadas.
- Regresion compartida inicial: 103 pruebas aprobadas.
- Regresion final de modulos afectados: 84/84 aprobadas.
- Suite completa: 375/375 aprobadas; 3 pruebas omitidas de forma controlada.
- `npm run build` web: aprobado.
- `npm run lint` web: 0 errores; 50 advertencias preexistentes fuera del alcance.
- `npx tsc --noEmit`: aprobado.
- `npm run lint` movil: aprobado, 0 errores y 0 advertencias.
- `npx expo-doctor`: 18/18 aprobado.
- Exportacion Android: aprobada; 1,531 modulos empaquetados.
- Metro/Expo: activo en puerto 8081 y responde HTTP 200.

### Produccion

Desplegado en `https://kp-software.tech` con commit `da75ac1`.

- Respaldo: `/var/www/medicore/backups/sprint18a_20260801_054523`.
- Incluye dump MySQL, bundle Git, Nginx, `medicore.service` y SHA-256.
- Migraciones: sin cambios pendientes.
- `manage.py check`: aprobado.
- Build Vite: aprobado.
- `medicore.service`: activo.
- Nginx: configuracion valida y servicio activo.
- HTTPS login: 200, certificado verificado.
- API sin autenticacion: 401 esperado.
- API autenticada en produccion: dashboard, usuarios, alertas, estado y sesiones respondieron 200.
- Aislamiento: usuario y medico de otra clinica respondieron 404.
- Paginacion: activa; la respuesta contiene `results` y solo IDs de la clinica autenticada.

El servidor conserva cambios preexistentes no relacionados en `frontend/package-lock.json` y la carpeta `backups/`; no fueron revertidos ni incluidos en commits.

### Android fisico

No certificado aun. Debe probarse en un dispositivo con Expo Go o build de desarrollo: login, dashboard, periodos, usuarios, alta/edicion, medico/horarios, sesiones, alertas, configuracion, offline, token vencido, logout y cambio de usuario. El resultado debe ser aportado por el propietario; Expo web no reemplaza esta evidencia.

### Pendientes Sprint 1.8B

- Bloqueos de agenda persistentes con vacaciones/ausencias y analisis de citas afectadas.
- Alertas persistentes con reconocimiento/asignacion si el negocio lo requiere.
- Certificacion Android fisica y accesibilidad con modelos reales de telefono.
