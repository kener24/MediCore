# Checklist de seguridad de produccion

- [x] Backup DB, Git, `.env`, Nginx y systemd verificado.
- [x] Commits funcionales y ramas remotas actualizadas.
- [x] Migraciones aplicadas (`audit.request_id` y blacklist SimpleJWT).
- [x] `DEBUG=False` y clave secreta de produccion presente sin exponer su valor.
- [x] CORS/CSRF limitados a `kp-software.tech` y `www`.
- [x] HTTPS, redireccion, certificado, renovacion simulada y HSTS comprobados.
- [x] `/media/` responde 404 y la suite de descargas autorizadas esta aprobada.
- [x] Configuracion Nginx respaldada y `nginx -t` aprobado.
- [x] Gunicorn/Nginx activos y estables despues de la correccion operativa.
- [x] Login, logout, refresh, replay y revocacion aprobados.
- [x] Clinica A no obtiene recursos de Clinica B.
- [x] Superadmin recibe 403/404 en datos clinicos.
- [x] AuditLog guarda request ID y no contiene contrasenas ni tokens.
- [ ] Smoke manual completo en Chrome y Edge.
- [ ] Android fisico por rol; no declarar aprobado hasta realizarlo.

## Incidencia controlada del despliegue

El despliegue dejo temporalmente `.env` como `ubuntu:ubuntu 640`, por lo que los
workers `www-data` no podian leerlo y Nginx devolvio 502 en `/api/`. Se corrigio
a `ubuntu:www-data 640`, se reinicio Gunicorn y se repitieron satisfactoriamente
las pruebas publicas e internas. Desde la correccion el servicio registra cero
reinicios automaticos.
