# Respaldos y recuperación ante desastres

## Política

- Alcance: MySQL completo, directorio `media` y configuración operativa no secreta de Nginx/systemd.
- Exclusiones deliberadas: `.env`, contraseñas, claves privadas y tokens.
- Frecuencia: diaria a las 02:30 de Honduras (08:30 UTC), con retraso aleatorio máximo de 5 minutos.
- Retención: 7 diarios, 5 semanales y aproximadamente 6 mensuales.
- Cifrado: AES-256-CBC con PBKDF2 y una clave root-only fuera del repositorio.
- Verificación en cada ejecución: descifrado temporal, SHA-256, prueba gzip y lectura de archivos tar.
- La auditoría de documentos compara referencias de base de datos con archivos sin borrar nada.

## Objetivos

- RPO comprometido: máximo 24 horas mientras el timer diario y la copia externa estén operativos.
- RTO objetivo de base de datos: 30 minutos en una instancia sana.
- RTO objetivo de servidor completo: 2 a 4 horas, incluyendo aprovisionamiento, paquetes, código, Nginx, Gunicorn, restauración y validación.

El RTO real se registra al ejecutar `restore-test.sh`; el resultado debe conservarse en la evidencia del sprint.

## Restauración aislada

```bash
sudo /var/www/medicore/deploy/scripts/restore-test.sh
```

El proceso descifra el último backup, crea una base temporal con nombre `medicore_restore_test_*`, importa el dump, valida tablas y conteos críticos, audita media y elimina la base temporal al terminar. Nunca escribe sobre `medicore_db`.

## Recuperación total

1. Crear una instancia Ubuntu equivalente y restringir red.
2. Instalar Nginx, MySQL, Python, Node y Certbot.
3. Clonar la versión de código indicada por el manifiesto del backup.
4. Recuperar la clave de cifrado desde custodia separada.
5. Verificar el backup con `verify-backup.sh`.
6. Restaurar primero en una base temporal y revisar conteos.
7. Detener escrituras, crear una base vacía y restaurar el dump validado.
8. Restaurar `media` con propietario `www-data` y permisos mínimos.
9. Instalar dependencias, ejecutar migraciones pendientes y compilar frontend.
10. Probar health/readiness, login por rol y operaciones de lectura antes de abrir tráfico.

## Rollback de despliegue

- Antes del despliegue se registra commit actual y se genera backup verificado.
- Si falla compilación, migración o checks, no se reinicia el servicio.
- Si falla después del reinicio, se restaura el commit anterior, se recompila y se reinicia Gunicorn.
- Una migración destructiva nunca se revierte automáticamente. Se evalúa migración inversa o restauración en una base nueva, conservando la original para análisis.

## Riesgo pendiente

Una copia en el mismo servidor no cubre pérdida total de Lightsail. `MEDICORE_OFFSITE_DIR` permite una segunda copia automática cuando exista un volumen o destino externo montado. Hasta configurar y probar ese destino de forma periódica, el RPO ante pérdida total de instancia no puede certificarse como cubierto.
