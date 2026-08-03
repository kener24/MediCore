# MediCore Ubuntu Deployment

Target layout:

- App: `/var/www/medicore`
- Backend: Django + Gunicorn on `127.0.0.1:8000`
- Frontend: Vite build served by Nginx from `/var/www/medicore/frontend/dist`
- Database: MySQL

Basic server flow:

1. Copy or clone the repository to `/var/www/medicore`.
2. Create `/var/www/medicore/.env` using `.env.production.example`.
   Keep it readable only by the deployment owner and the service group:

   ```bash
   sudo chown ubuntu:www-data /var/www/medicore/.env
   sudo chmod 640 /var/www/medicore/.env
   ```

   Recheck these permissions after restoring `.env` from a backup.
3. Create MySQL database and user.
4. Create Python virtual environment at `/var/www/medicore/venv`.
5. Install backend requirements and run migrations.
6. Build frontend with `npm ci && npm run build`.
7. Install `deploy/systemd/medicore.service` into `/etc/systemd/system/`.
8. Install `deploy/nginx/medicore.conf` into `/etc/nginx/sites-available/`.
9. Enable the Nginx site and reload services.

## Transactional email

Use an authenticated SMTP provider. Configure the `EMAIL_*` variables from
`.env.production.example`; never commit SMTP credentials. Validate delivery with:

```bash
sudo -u www-data /var/www/medicore/venv/bin/python /var/www/medicore/manage.py test_email_delivery --to destination@example.com
```

Install the notification timer to generate appointment, billing, cash, fiscal,
and inventory alerts automatically:

```bash
sudo cp deploy/systemd/medicore-notifications.service /etc/systemd/system/
sudo cp deploy/systemd/medicore-notifications.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now medicore-notifications.timer
```

Use Certbot after the domain points to the server:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```
