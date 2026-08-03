# Estado operativo del SaaS

`GET /api/admin/system-status/` es de solo lectura y exclusivo del superadministrador.

Expone:

- Estado de API y base de datos.
- Estado agregado de cola y scheduler cuando el servidor lo informa.
- Estado y fecha confirmada del último backup cuando existe monitoreo externo.
- Versión, entorno y hora de comprobación.

No expone rutas de backups, IP privadas, cadenas de conexión, variables `.env`, secretos JWT, credenciales AWS/SMTP ni claves. La aplicación móvil no puede descargar/restaurar backups ni ejecutar comandos o tareas arbitrarias.
