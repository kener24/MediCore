# Correo transaccional de MediCore

MediCore utiliza el backend SMTP de Django. Las credenciales viven únicamente
en `/var/www/medicore/.env` y nunca deben guardarse en Git.

## Eventos cubiertos

- Recuperación de contraseña con token de un solo uso y expiración.
- Verificación de correo.
- Confirmación de cambio de contraseña.
- Bloqueo temporal de cuenta.
- Alertas operativas habilitadas por el usuario: citas, facturación, pagos,
  caja, inventario, compras, auditoría y sistema.

## Amazon SES

La configuración recomendada para el servidor de Ohio es:

```env
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=email-smtp.us-east-2.amazonaws.com
EMAIL_PORT=587
EMAIL_HOST_USER=<usuario SMTP de SES>
EMAIL_HOST_PASSWORD=<contraseña SMTP de SES>
EMAIL_USE_TLS=True
EMAIL_USE_SSL=False
EMAIL_TIMEOUT=10
DEFAULT_FROM_EMAIL=MediCore <no-reply@kp-software.tech>
EMAIL_REPLY_TO=soporte@kp-software.tech
EMAIL_NOTIFICATIONS_ENABLED=True
```

Antes de activar el envío se debe verificar `kp-software.tech` en SES, publicar
los registros DKIM/SPF entregados por AWS y solicitar acceso de producción para
salir del sandbox.

## Verificación

```bash
sudo -u www-data /var/www/medicore/venv/bin/python \
  /var/www/medicore/manage.py check

sudo -u www-data /var/www/medicore/venv/bin/python \
  /var/www/medicore/manage.py test_email_delivery --to destino@example.com
```

El segundo comando debe terminar con `Correo de prueba enviado correctamente.`
No imprimir ni compartir `EMAIL_HOST_PASSWORD` durante el diagnóstico.
