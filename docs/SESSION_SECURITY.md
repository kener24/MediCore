# Política de sesiones

- Login crea una `UserSession` con clave aleatoria, hash del refresh, expiración, última actividad y dispositivo.
- Access y refresh contienen `sid`; el backend exige que coincida con `X-Session-Key`.
- Un usuario inactivo, clínica suspendida, sesión vencida o revocada obtiene 401.
- Logout revoca la sesión, intenta blacklist del refresh y desactiva el dispositivo push indicado.
- Cambio de contraseña mantiene la sesión actual y revoca las demás. Recuperación de contraseña revoca todas.
- Admin clínica puede consultar/revocar solo sesiones de su clínica. Superadmin solo opera sus sesiones y las de administradores, no personal clínico detallado.
- Ninguna respuesta expone `session_key`, refresh, IP completa o user-agent completo.
