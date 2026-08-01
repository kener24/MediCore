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
