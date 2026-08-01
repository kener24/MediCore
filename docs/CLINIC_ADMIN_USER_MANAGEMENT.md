# Gestion de usuarios por administrador de clinica

## Endpoints reutilizados

- `GET/POST /api/clinic-admin/users/`
- `GET/PATCH /api/clinic-admin/users/{id}/`
- `POST /api/clinic-admin/users/create-staff/`
- `PATCH /api/clinic-admin/users/{id}/activate/`
- `PATCH /api/clinic-admin/users/{id}/deactivate/`
- `POST /api/clinic-admin/users/{id}/reset-password/`
- `POST /api/clinic-admin/users/{id}/revoke-sessions/`

## Reglas

El backend asigna la clinica autenticada, valida rol y unicidad, y crea usuario/perfil medico dentro de una transaccion. La interfaz deshabilita el boton mientras guarda y envia una clave de idempotencia; la restriccion unica de correo evita duplicados concurrentes.

Desactivar conserva el historial, exige motivo, bloquea login y revoca sesiones. Reactivar no restaura sesiones. El ultimo administrador activo no puede desactivarse ni perder su rol. Recuperar contrasena envia un enlace al usuario objetivo sin revelar token ni contrasena.

Las respuestas administrativas omiten `is_superuser`, `is_staff`, IP completa, hash y otros secretos.
