# Evidencia de pruebas de seguridad

Fecha: 2026-08-03.

## Suite dedicada

`python manage.py test tests.security --parallel 4`: 20/20 pruebas aprobadas.

Cobertura: login generico, throttle por IP e identificador, claim `sid`, refresh
rotativo y replay, logout, cambio de contrasena entre dispositivos, request ID,
redaccion, auditoria append-only, IDOR, relaciones A/B, superadmin, roles,
archivos privados y operaciones clinicas y financieras.

## Escaneo estatico

- Sin `fields="__all__"` en serializers sensibles.
- Sin `dangerouslySetInnerHTML`.
- Sin logs moviles de tokens o respuestas clinicas; ErrorBoundary solo reporta
  el mensaje tecnico sin payload privado.
- `.env`, media, logs y credenciales estan ignorados.
- Se retiro una clave de desarrollo del modulo Django legado no utilizado. No
  se reescribio historial; debe rotarse si alguna vez se reutilizo fuera de
  desarrollo.

## Dependencias

- Web: dos avisos altos de React Router relativos a RSC/Server Actions. MediCore
  es SPA Vite y no usa ese modo; el arreglo automatico exige un cambio forzado
  y no se aplico.
- Movil: 17 avisos de tooling Expo/Metro (2 altos y 15 moderados). El arreglo
  forzado exige Expo SDK 57, incompatible con SDK 54; no se aplico una
  actualizacion mayor automatica.
- No se uso `npm audit fix --force`.

## Regresion y compilacion local

- `python manage.py check`: aprobado, 0 errores.
- `python manage.py check --deploy`: salida 0 con configuracion segura; solo
  persisten 334 advertencias historicas de esquema OpenAPI.
- `python manage.py makemigrations --check --dry-run`: sin cambios pendientes.
- `python manage.py test --parallel 4`: 401/401 aprobadas; 3 omitidas de forma
  controlada.
- `pip check`: sin dependencias Python rotas.
- Web `npm run lint`: 0 errores y 44 advertencias historicas.
- Web `npm run build`: aprobado; 1,852 modulos compilados.
- Movil `npx tsc --noEmit`: aprobado.
- Movil `npm run lint`: aprobado.
- `npx expo-doctor`: 18/18 comprobaciones aprobadas.
- Exportacion Android Expo: aprobada; 1,534 modulos empaquetados.
- Metro activo en `192.168.101.17:8081` durante la validacion local.

## Produccion

- Respaldo verificado en
  `/var/www/medicore/backups/sprint19a_20260803_181516`: dump MySQL comprimido,
  bundle Git, `.env`, Nginx, systemd, lockfile, estado previo y SHA-256.
- Desplegados los commits funcionales `a444ccf` y `664131a`.
- Migraciones `audit.0003_auditlog_request_id` y SimpleJWT blacklist aplicadas.
- `manage.py check`: 0 problemas. `check --deploy`: salida 0; 334 advertencias
  historicas OpenAPI y ninguna advertencia de seguridad de Django.
- Prueba segura con datos temporales: login admin 200, tenant propio 200,
  tenant ajeno 404, refresh rotado 200, replay 401, logout 204, refresh revocado
  401, login superadmin 200, dashboard 200 y dominios clinicos 403.
- La prueba confirmo `request_id`, ausencia de contrasenas en AuditLog y elimino
  sus usuarios/pacientes temporales; conteo final de usuarios temporales: 0.
- HTTPS raiz y `www`: 200; HTTP: 301 a HTTPS; API anonima: 401 JSON;
  `/media/`: 404.
- CORS acepta solo `https://kp-software.tech`, no devuelve origen para un dominio
  ajeno y no habilita credenciales CORS.
- HSTS, CSP, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy y
  X-Request-ID presentes.
- Certificado valido para raiz y `www`; `certbot renew --dry-run
  --no-random-sleep-on-renew` aprobado.
- Nginx, `medicore.service` y timer de notificaciones activos. Gunicorn mantiene
  tres workers y escucha solo en `127.0.0.1:8000`.

### Incidencia y correccion

La primera prueba publica detecto 502 porque `.env` quedo con grupo `ubuntu`
tras restaurarlo. Gunicorn corre como `www-data`. Se aplico
`ubuntu:www-data 640`, se reinicio el servicio y se repitio toda la certificacion
con resultado correcto y cero reinicios posteriores. La guia de despliegue ya
incluye esta verificacion.

## Certificaciones manuales pendientes

- Android fisico no fue probado. TypeScript, Expo Doctor y exportar Android no
  sustituyen login, expiracion, logout, cambio de usuario e intentos cruzados en
  un telefono real por cada rol.
- Falta completar el smoke tactil en Chrome y Edge con cuentas de prueba.

Por la regla del sprint, la certificacion automatizada y el despliegue estan
completos, pero el sprint no debe declararse certificado al 100% hasta registrar
esas dos pruebas manuales.
