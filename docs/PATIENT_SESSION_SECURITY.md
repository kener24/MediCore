# Seguridad de sesión del paciente

## Inicio, refresh y expiración

Los tokens se guardan en almacenamiento seguro móvil. El interceptor coordina una sola renovación cuando varias solicitudes reciben `401`; las solicitudes en espera reutilizan el resultado y cada solicitud se reintenta como máximo una vez.

Un `403` no cierra la sesión. Si el refresh falla, se limpian tokens, caché privada y archivos temporales, se resetea la navegación y se muestra una única pantalla de sesión expirada.

## Logout y sesiones activas

Logout intenta revocar la instalación push y la sesión del servidor, pero siempre limpia el estado local aunque el servidor no esté disponible. La pantalla de sesiones expone únicamente dispositivo, plataforma, ubicación protegida, inicio, última actividad y estado.

El usuario puede cerrar sesiones propias; no puede consultar ni revocar las de otro usuario. Si cierra la sesión actual, la aplicación sale de forma controlada.

## Inactividad y contraseña

Web y móvil aplican un límite global de inactividad de 30 minutos. Al superarlo no se conservan datos privados visibles. El cambio de contraseña mantiene la política del backend y revoca sesiones según la configuración de seguridad existente; nunca se almacena la contraseña para reautenticar.
