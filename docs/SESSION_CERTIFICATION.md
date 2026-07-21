# Certificación de autenticación y sesión

Fecha de revisión: 2026-07-21

## Diseño certificado

- Login JWT entrega access token, refresh token, usuario y una clave de sesión MediCore.
- Cada petición JWT debe incluir `X-Session-Key` y pertenecer a una sesión activa, no vencida y del mismo usuario.
- El refresh exige que el hash del refresh token coincida con la sesión activa.
- Logout revoca la sesión en backend.
- La revocación remota invalida access y refresh porque ambos dependen de la sesión activa.
- Los listados de sesiones no exponen la clave `session_key`.
- Usuario inactivo o clínica inactiva no pueden renovar y su sesión se revoca.
- No se agregaron tablas ni migraciones; se reutilizó `UserSession`.

## Web

- Los 401 intentan un único refresh y las solicitudes simultáneas esperan el mismo resultado.
- Si el refresh falla, se eliminan access, refresh y clave de sesión de `localStorage`.
- El evento global de logout desmonta la experiencia privada y redirige al login mediante los guards.
- Los 403 no cierran sesión y muestran: “No tienes permiso para realizar esta acción.”
- Logout limpia el estado local incluso si el servidor no responde.

## Móvil

- Tokens, clave de sesión y usuario se guardan en SecureStore.
- El refresh simultáneo se deduplica mediante una promesa compartida.
- La caché API incluye la clave de sesión como contexto de usuario.
- Logout y expiración eliminan SecureStore y todas las claves privadas `medicore.apiCache.*`.
- Logout usa limpieza garantizada incluso sin conexión.
- Al quedar `user = null`, `RootNavigator` desmonta el navegador del rol; el botón atrás no recupera la sesión cerrada.

## Casos automatizados

| Caso | Resultado |
| --- | --- |
| Login correcto | Aprobado |
| Contraseña incorrecta | Aprobado |
| Bloqueo temporal por intentos fallidos | Aprobado |
| Usuario inactivo | Aprobado |
| Clínica inactiva | Aprobado |
| Refresh válido con sesión activa | Aprobado |
| Refresh sin clave de sesión | Aprobado: 401 |
| JWT sin clave de sesión | Aprobado: 401 |
| Logout | Aprobado: 204 y sesión revocada |
| Reutilizar refresh después de logout | Aprobado: 401 |
| Revocación remota | Aprobado |
| Cambio y recuperación de contraseña | Aprobado |

## Consideraciones

- SimpleJWT no necesita blacklist independiente para este flujo porque el refresh está ligado al hash y estado de `UserSession`.
- Swagger o clientes externos deben enviar `X-Session-Key` además de `Authorization`.
- Los tokens y contraseñas no deben incluirse en logs, capturas ni documentos de evidencia.
