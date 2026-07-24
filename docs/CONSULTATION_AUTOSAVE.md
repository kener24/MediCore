# Autosave y recuperación de consulta

## Web

- Detecta cambios en el formulario controlado.
- Espera 3 segundos sin nuevos cambios antes de guardar.
- Conserva una copia temporal en `sessionStorage`.
- La clave contiene clínica, usuario, paciente, visita y consulta.
- Limpia el borrador después de sincronizar o cerrar sesión.
- Advierte al cambiar de ruta o cerrar la pestaña con cambios pendientes.

## Móvil

- Conserva el borrador temporal mediante `expo-secure-store`.
- Guarda localmente después de 600 ms y sincroniza con el servidor después de 3 segundos.
- Observa conectividad con NetInfo.
- Mantiene los cambios pendientes durante una expiración de sesión para que el mismo usuario pueda recuperarlos.
- Limpia todos los borradores clínicos al cerrar sesión explícitamente.
- Usa una clave compuesta por `clinicId`, `userId`, `patientId`, `visitId` y `consultationId`.

## Estados visibles

- Sin cambios pendientes.
- Cambios pendientes.
- Guardando cambios.
- Cambios sincronizados.
- Sin conexión.
- Error de sincronización.
- Conflicto de edición.

## Conflictos

Cada guardado envía `expected_version`. El servidor bloquea la consulta, compara la versión y responde HTTP 409 si otro dispositivo guardó primero. El cliente no sobrescribe el servidor y conserva el contenido local para revisión.

## Recuperación

Al abrir una consulta en progreso se carga primero el servidor y luego se revisa el borrador local. Si existe contenido pendiente, el usuario elige entre recuperar el borrador, usar el servidor o cancelar para revisar. No se reemplazan datos automáticamente.

## Finalización

Finalizar siempre intenta guardar primero. Si el guardado falla, no se completa la consulta. Después del éxito se elimina el borrador local y la pantalla queda en modo de lectura.

