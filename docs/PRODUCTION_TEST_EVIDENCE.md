# Evidencia de pruebas en producción

## Sprint 1.6A

Este archivo se completa con resultados verificables durante el despliegue. No contiene contraseñas ni información clínica real.

### Controles previos locales

- Migración `hospitalization.0003`: aplicada correctamente.
- `manage.py check`: correcto; aviso de remitente de correo local pendiente de configuración productiva.
- Suite enfocada: 20 pruebas correctas, una omitida por requerir MySQL.
- Diagnóstico de camas: consistente.
- Build web: correcto.
- TypeScript móvil: correcto.
- Lint Expo: correcto.

### Producción

- Fecha: 2026-07-29.
- Commit funcional desplegado: `ef42c58`.
- Respaldo validado: `backups/sprint16a_20260729_160641/` con dump MySQL, bundle Git, lockfile y Nginx.
- Migración `hospitalization.0003`: aplicada en MySQL.
- Build Vite: correcto, 1,850 módulos transformados.
- Servicios `medicore`, `nginx` y `mysql`: activos.
- `nginx -t`: correcto.
- HTTPS `/login`: disponible.
- Diagnóstico productivo: una cama, una asignación activa y un internamiento; sin errores ni advertencias de consistencia.
- Suite completa de hospitalización sobre MySQL temporal: 20/20 correcta, incluida concurrencia.
- La base temporal y el permiso concedido para pruebas fueron eliminados al finalizar.

### Pruebas HTTPS por rol

- Médico: listado e indicaciones `200`.
- Enfermería: listado e indicaciones `200`.
- Recepción: listado `200`; campos clínicos profundos ausentes.
- Paciente: acceso interno `403`.
- Superadmin: acceso clínico interno `403`.
- Las sesiones creadas por las pruebas fueron cerradas por el endpoint de logout.

### Regresión global

- `python manage.py test --parallel 4 --keepdb --noinput`.
- 340 pruebas ejecutadas correctamente en 529.451 segundos.
- 3 pruebas omitidas por condiciones previstas.
- Ningún fallo ni error.
- El primer intento monohilo fue detenido por el límite de 15 minutos; no había reportado fallos. Se repitió completo en cuatro bases de prueba aisladas.

### Móvil

- `npx tsc --noEmit`: correcto.
- `npx expo-doctor`: 18/18 comprobaciones correctas.
- `npx expo lint`: 0 errores; permanece una advertencia preexistente fuera de hospitalización en `CashierRegisterPaymentScreen.tsx`.
- Expo Tunnel: levantado contra `https://kp-software.tech/api`.
- Prueba Android física: pendiente de confirmación del usuario.

### Advertencias no bloqueantes

MySQL informa que no implementa restricciones únicas condicionales de Django. Hospitalización mantiene exclusión mediante `transaction.atomic()`, bloqueo de paciente/internamiento/cama con `select_for_update()` y comprobaciones dentro de la transacción. La prueba concurrente MySQL confirmó que solo una asignación tiene éxito.

### Android físico

Requiere confirmación del usuario desde un dispositivo real. Expo se dejará disponible al final; no se afirmará una prueba física sin esa confirmación.
