# MediCore Ubuntu Deployment

Target layout:

- App: `/var/www/medicore`
- Backend: Django + Gunicorn on `127.0.0.1:8000`
- Frontend: Vite build served by Nginx from `/var/www/medicore/frontend/dist`
- Database: MySQL

Basic server flow:

1. Copy or clone the repository to `/var/www/medicore`.
2. Create `/var/www/medicore/.env` using `.env.production.example`.
3. Create MySQL database and user.
4. Create Python virtual environment at `/var/www/medicore/venv`.
5. Install backend requirements and run migrations.
6. Build frontend with `npm ci && npm run build`.
7. Install `deploy/systemd/medicore.service` into `/etc/systemd/system/`.
8. Install `deploy/nginx/medicore.conf` into `/etc/nginx/sites-available/`.
9. Enable the Nginx site and reload services.

Use Certbot after the domain points to the server:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```
