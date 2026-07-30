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

## Advertencias controladas

- MySQL advierte sobre algunas restricciones condicionales históricas de otros módulos. La unicidad de horarios de medicamentos de este sprint se convirtió a una restricción compatible con MySQL y se validó que no existían duplicados antes de aplicarla.
- React Router quedó en `7.18.2`. `npm audit` conserva un aviso del modo RSC, pero MediCore es una SPA Vite con `createBrowserRouter` y no ejecuta acciones RSC/SSR. Migrar a React Router 8 requiere un sprint propio porque cambia paquete, React mínimo y Node mínimo.
- El build avisa que el paquete principal supera 500 kB. No afecta funcionamiento; la división de código queda como mejora de rendimiento posterior.

## Android físico

La validación estática y el inicio de Expo pueden certificarse desde el entorno de desarrollo. La interacción en un dispositivo Android físico requiere confirmación manual del usuario y no se declarará aprobada sin esa evidencia.
