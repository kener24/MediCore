# Plan de recuperación ante desastres

## Objetivos

- RPO operativo: hasta 24 horas mientras el backup diario y la copia externa estén vigentes.
- RTO medido de restauración DB/media en servidor sano: 11 segundos para el volumen actual.
- RTO objetivo de aplicación en servidor sano: 30 minutos.
- RTO objetivo por pérdida total de instancia: 2 a 4 horas.

## Procedimiento por escenario

| Escenario | Detección | Recuperación | Validación |
|---|---|---|---|
| Aplicación/Gunicorn caído | readiness, systemd, journal | revisar error y reiniciar `medicore` | health, login y API por rol |
| Nginx caído | HTTPS falla; backend local responde | validar `nginx -t` y reiniciar | HTTP 301, HTTPS 200 |
| MySQL caído | readiness 503 | revisar disco/logs, iniciar MySQL | `SELECT 1`, readiness, conteos |
| Error de despliegue | 5xx o flujo regresado | volver al commit conocido y recompilar | smoke test completo |
| Base corrupta | checks/consultas fallan | preservar original; restaurar backup verificado en DB nueva | relaciones, conteos y media |
| Backup reciente corrupto | verificación/restore falla | usar anterior verificado; conservar corrupto para análisis | restauración aislada |
| Servidor perdido | instancia inaccesible | aprovisionar Ubuntu, instalar stack, recuperar código, secretos y backup externo | HTTPS, permisos, roles y operaciones |

Toda recuperación debe registrar hora, incidente, responsable, backup/commit usado y resultado. La comunicación no debe incluir datos clínicos. La clave de cifrado y secretos se recuperan desde custodia separada.
