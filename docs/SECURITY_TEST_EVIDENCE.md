# Evidencia de pruebas de seguridad

Fecha: 2026-08-03.

## Suite dedicada

`python manage.py test tests.security --parallel 4`: 20/20 pruebas aprobadas.

Cobertura: login genérico, throttle IP/identificador, claim `sid`, refresh rotativo/replay, logout, cambio de contraseña entre dispositivos, request ID, redacción, append-only, IDOR, relaciones A/B, superadmin, roles, archivos privados y operaciones clínicas/financieras.

## Escaneo estático

- Sin `fields="__all__"` en serializers sensibles.
- Sin `dangerouslySetInnerHTML`.
- Sin logs móviles de tokens/respuestas clínicas; solo ErrorBoundary reporta mensaje técnico sin payload.
- `.env`, media, logs y credenciales están ignorados.
- Se retiró una clave de desarrollo del módulo Django legado no utilizado. No se reescribió historial; rotar si alguna vez fue reutilizada fuera de desarrollo.

## Dependencias

- Web: dos avisos altos de React Router relativos a RSC/Server Actions. MediCore es SPA Vite y no usa ese modo; el fix automático propone un cambio forzado y no se aplicó. Riesgo documentado.
- Móvil: 17 avisos de tooling Expo/Metro (2 altos y 15 moderados, incluyendo `brace-expansion`, `postcss` y transitivos). `npm audit fix --dry-run` no ofrece cambios compatibles y la corrección forzada exige SDK 57, incompatible con SDK 54; no se aplicó upgrade mayor automático.
- No se usó `npm audit fix --force`.

## Regresión y compilación local

- `python manage.py check`: aprobado, 0 errores.
- `python manage.py check --deploy`: código de salida 0 con configuración segura simulada; persisten advertencias históricas de esquema OpenAPI, no advertencias de seguridad de Django.
- `python manage.py makemigrations --check --dry-run`: sin cambios pendientes.
- `python manage.py test --parallel 4`: 401/401 pruebas aprobadas; 3 omitidas de forma controlada.
- `pip check`: sin dependencias Python rotas.
- Web `npm run lint`: 0 errores y 44 advertencias históricas.
- Web `npm run build`: aprobado; 1,852 módulos compilados.
- Móvil `npx tsc --noEmit`: aprobado.
- Móvil `npm run lint`: aprobado.
- `npx expo-doctor`: 18/18 comprobaciones aprobadas.
- Exportación Android Expo: aprobada; 1,534 módulos empaquetados.
- Metro está activo en `192.168.101.17:8081`.

La evidencia de producción se agrega después del despliegue. Android físico sigue siendo una validación manual independiente y no se declara aprobado con estas pruebas.
