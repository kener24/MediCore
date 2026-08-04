# Política de retención de respaldos

| Clase | Frecuencia | Retención |
|---|---|---|
| Diario | Una vez al día | 7 días |
| Semanal | Copia del domingo | 35 días |
| Mensual | Copia del día 1 | 190 días |

La limpieza solo afecta archivos `.enc` bajo `/var/backups/medicore/{daily,weekly,monthly}` y se ejecuta después de crear y verificar el nuevo respaldo. No elimina media ni archivos de la aplicación.

Antes de cambiar retención se debe revisar `df -h`, crecimiento de MySQL/media y disponibilidad de la copia externa. Un respaldo no debe eliminarse si es la única copia verificada necesaria para una investigación o recuperación.
