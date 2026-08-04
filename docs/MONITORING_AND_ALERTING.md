# Monitoreo y alertas

## Cobertura actual

- `/health/` y `/health/live/`: proceso disponible, sin consulta costosa.
- `/health/ready/`: aplicación y `SELECT 1` a MySQL; devuelve 503 de forma controlada si DB falla.
- `medicore-monitor.timer`: ejecuta comprobación cada cinco minutos.
- Middleware: registra método, ruta sin query string, estado, duración y request ID.
- Solicitud lenta: advertencia desde 750 ms.
- Disco crítico: 90%.
- Backup vencido: 26 horas.
- Logs: journald y Nginx con rotación del sistema.

No se registran cuerpos, tokens, cookies, diagnósticos ni datos clínicos. Los endpoints de salud no revelan hosts, versiones o credenciales.

## Alertas

`medicore-monitor.service` usa `OnFailure=medicore-monitor-alert.service`. El comando `send_operational_alert` envía un correo genérico, valida el origen y limita a uno por hora. La entrega SMTP fue probada localmente, incluyendo el bloqueo de duplicados.

En producción falta definir `OPERATIONS_ALERT_EMAIL`; hasta hacerlo, la alerta queda registrada en journal pero no tiene destinatario de correo. No se eligió una dirección personal por inferencia.

## Diagnóstico

```bash
systemctl status medicore nginx mysql --no-pager
systemctl list-timers --all | grep medicore
journalctl -u medicore-monitor --since today --no-pager
curl -fsS https://kp-software.tech/health/ready/
```
