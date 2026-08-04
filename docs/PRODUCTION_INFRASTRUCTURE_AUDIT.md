# Auditoría de infraestructura de producción

Fecha de inventario: 2026-08-03. No se registran secretos, credenciales ni cadenas de conexión.

## Plataforma

| Componente | Estado observado |
|---|---|
| Proveedor | AWS Lightsail, región us-east-2 |
| Sistema | Ubuntu 24.04.4 LTS, kernel AWS 6.17 |
| CPU | 2 vCPU Intel Xeon Platinum 8259CL |
| Memoria | 1.9 GiB; 829 MiB disponibles durante la medición |
| Swap | 2 GiB; 21 MiB en uso |
| Disco | 58 GiB; 6.9 GiB usados (12%) |
| Dominio | kp-software.tech con HTTPS |
| Reverse proxy | Nginx 1.24.0 |
| Aplicación | Django 5.2.15 y Gunicorn 22.0.0, 3 workers |
| Base de datos | MySQL 8.0.46 en loopback; 77 tablas, 7.88 MiB |
| Runtime | Python 3.12.3, Node 22.22.3, npm 10.9.8 |
| Frontend | React/Vite compilado en `/var/www/medicore/frontend/dist` |

## Consumo observado

- Gunicorn: aproximadamente 233 MiB entre proceso maestro y tres workers.
- MySQL: aproximadamente 519 MiB RSS; buffer pool InnoDB de 128 MiB.
- Máximo histórico de conexiones MySQL observado: 3 de 151.
- Media: 92 KiB. Respaldos manuales existentes: 40 MiB.
- Logs Nginx: aproximadamente 764 KiB, con `logrotate` activo.
- Tablas con mayor actividad: notificaciones (1,307), auditoría (723), sesiones (250), citas (227), consultas (155) y facturas (152).

No hay evidencia actual de presión de disco, memoria, conexiones o bloqueos. No se justifica incorporar Redis, Celery ni una plataforma de métricas pesada en esta capacidad.

## Servicios y red

- Activos: `medicore`, `nginx`, `mysql` y `medicore-notifications.timer`.
- Puertos públicos: 80 y 443. Gunicorn escucha en `127.0.0.1:8000`; MySQL en `127.0.0.1:3306`.
- Certbot y logrotate tienen timers activos.
- Generación de notificaciones: cada hora mediante systemd.
- El acceso público a `/media/` está bloqueado; los documentos usan endpoints autenticados.

## Hallazgos

1. El log lento de MySQL estaba desactivado y no había consultas lentas registradas ni esperas por bloqueos.
2. El frontend se entregaba como un único chunk inicial de 1,017.22 kB.
3. No había health checks públicos seguros ni estado verificable de respaldos.
4. Los respaldos existentes no tenían timer, cifrado, retención ni restauración certificada.
5. Gunicorn tenía reciclaje ilimitado de workers.

Los cambios del Sprint 1.9B atienden estos puntos sin cambiar la arquitectura base.
