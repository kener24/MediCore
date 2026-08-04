# Runbook operacional

## Endpoints

- `/health/`: proceso web disponible, sin consultar base de datos.
- `/health/live/`: liveness para detectar procesos bloqueados.
- `/health/ready/`: readiness con `SELECT 1`; responde 503 si MySQL no está disponible.

No exponen versiones, nombres internos, credenciales ni datos clínicos.

## Tareas programadas

| Timer | Frecuencia | Función | Usuario |
|---|---|---|---|
| `medicore-notifications.timer` | Cada hora | Recordatorios y alertas del sistema | `www-data` |
| `medicore-backup.timer` | Diario | Backup cifrado y verificado | `root` |
| `medicore-monitor.timer` | Cada 5 min | HTTPS, API, DB, servicios, disco y edad del backup | `root` |
| `certbot.timer` | Sistema | Renovación TLS | `root` |
| `logrotate.timer` | Sistema | Rotación de logs | `root` |

## Comandos de diagnóstico

```bash
systemctl status medicore nginx mysql --no-pager
systemctl list-timers --all | grep medicore
journalctl -u medicore --since '30 minutes ago' --no-pager
journalctl -u medicore-monitor --since today --no-pager
curl -fsS https://kp-software.tech/health/ready/
df -h / && free -h
```

Los logs de aplicación contienen método, ruta sin query string, estado, duración y request ID. No se registran payloads, tokens, contraseñas ni datos clínicos.

## Umbrales iniciales

- Solicitud lenta: 750 ms.
- Disco crítico: 90%.
- Backup vencido: más de 26 horas.
- Readiness o servicio inactivo: crítico inmediato.
- Respuestas 5xx repetidas: investigar request ID en Gunicorn y Nginx.

## Pruebas de carga

`deploy/load/medicore_load_test.py` solo ejecuta GET. Por defecto prueba 5, 10, 25 y 50 usuarios concurrentes en local. En cualquier host no local se detiene si se solicita más de 10, salvo autorización explícita. Nunca se deben realizar pruebas agresivas sobre producción con usuarios reales.
