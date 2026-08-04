# Registro de tareas programadas

| Tarea | Frecuencia | Servicio | Objetivo | Si falla | Reintento |
|---|---|---|---|---|---|
| Notificaciones MediCore | Cada hora | `medicore-notifications.timer` | Recordatorios y alertas internas | Registro en journal | `systemctl start medicore-notifications.service` |
| Backup cifrado | Diario 08:30 UTC, retraso hasta 5 min | `medicore-backup.timer` | MySQL, media y configuración no secreta | Estado `failed`, monitor alerta | `systemctl start medicore-backup.service` |
| Monitor operativo | Cada 5 minutos | `medicore-monitor.timer` | HTTPS, readiness, servicios, disco y backup | Journal y `OnFailure` por correo si hay destinatario | `systemctl start medicore-monitor.service` |
| Renovación TLS | Timer del sistema | `certbot.timer` | Renovar HTTPS | Journal de Certbot | `certbot renew --dry-run` |
| Rotación de logs | Diaria | `logrotate.timer` | Evitar crecimiento ilimitado | Journal del sistema | `logrotate -d /etc/logrotate.conf` |

Al cierre, los tres timers de MediCore estaban activos. El monitor había terminado correctamente en sus últimas ejecuciones. Consultar fecha exacta con `systemctl list-timers --all` y resultado con `journalctl -u <servicio>`.
