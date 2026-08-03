# Checklist de seguridad de producción

- [ ] Backup DB, Git, `.env` metadata, Nginx y systemd verificado.
- [ ] Commits aprobados y ramas remotas actualizadas.
- [ ] Migraciones aplicadas (`audit.request_id` y blacklist SimpleJWT).
- [ ] `DEBUG=False` y SECRET_KEY segura.
- [ ] CORS/CSRF limitados a `kp-software.tech` y `www`.
- [ ] HTTPS, redirect, certificado y HSTS comprobados.
- [ ] `/media/` responde 404; descarga API autorizada funciona.
- [ ] Nginx config respaldada y `nginx -t` aprobado.
- [ ] Gunicorn/Nginx activos sin errores nuevos.
- [ ] Login/logout/refresh/replay/revocación aprobados.
- [ ] Clínica A no obtiene recursos B.
- [ ] Superadmin recibe 403/404 en datos clínicos.
- [ ] AuditLog guarda request ID y no secretos.
- [ ] Chrome/Edge smoke test.
- [ ] Android físico por rol (manual; no declarar hasta realizarlo).
