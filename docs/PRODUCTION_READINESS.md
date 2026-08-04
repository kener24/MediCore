# Readiness de producción - Sprint 1.9B

Fecha de cierre: 2026-08-04. Commit desplegado al iniciar cierre: `db05264`.

## Resultado ejecutivo

El sprint deja en producción optimizaciones medidas, health/readiness, logs de rendimiento, monitor cada cinco minutos, tareas certificadas, backup diario cifrado, retención, restauración real, prueba DB-media, límites de carga y runbooks. HTTPS y servicios están activos; no hubo errores en la prueba productiva de 150 solicitudes.

## Evidencia técnica

- Backend: 404 pruebas aprobadas, 3 omitidas; 111 pruebas impactadas aprobadas, 1 omitida.
- Concurrencia MySQL aislada: 3 aprobadas en 9.531 s.
- `manage.py check`: 0 problemas.
- `manage.py check --deploy`: exit 0; 337 avisos de generación OpenAPI, sin errores de configuración de despliegue.
- Web: lint con 0 errores y 41 avisos históricos tras retirar tres declaraciones sin uso; build aprobado.
- Bundle: 1,017.22 kB iniciales a 250.33 kB de código propio más vendors cacheables; agregado inicial 548.04 kB. Gzip agregado 260.08 a 165.43 kB.
- Móvil: instalación aprobada; TypeScript aprobado; lint aprobado; Expo Doctor 18/18; Metro inició correctamente.
- Expo `npm audit`: redujo de 18 a 15 avisos; queda 1 alto y 14 moderados en toolchain Expo 54. La corrección automática restante exige salto mayor a Expo 57 y no se forzó.
- Migraciones: sin cambios pendientes.
- Producción: `medicore`, Nginx, MySQL y timers activos; sin unidades fallidas.
- HTTPS: HTTP redirige 301; login 200; health y readiness 200.
- Backup: cifrado/verificado; restore aislado en 11 s; 77 tablas; media 5/5.
- Copia externa puntual: verificada fuera de Lightsail; automatización externa continua pendiente.

## Riesgos abiertos

1. Configurar un destinatario real en `OPERATIONS_ALERT_EMAIL`; mientras tanto el fallo queda en journal.
2. Automatizar la copia de cada backup fuera de la instancia y ejecutar simulacros periódicos.
3. Realizar prueba Android física por todos los roles; Metro no sustituye interacción en dispositivo.
4. Corregir progresivamente 41 avisos web de hooks/limpieza y 337 avisos de esquema OpenAPI.
5. Ejecutar carreras multihilo dedicadas para pago, fiscal, check-in y medicación además de su regresión transaccional.
6. Planificar la actualización de Expo 54 para resolver advisories del toolchain sin romper compatibilidad.
7. MySQL no aplica restricciones únicas condicionales de Django; mantener bloqueo transaccional y revisar migraciones.

## Recomendación

Readiness operativo condicionado: apto para operación controlada con monitoreo humano, backups y rollback. No se certifica como cierre absoluto hasta automatizar offsite, definir correo de alertas y completar Android físico y las carreras críticas pendientes.
