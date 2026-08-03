# Certificación móvil del superadministrador

## Alcance certificado

- Acceso exclusivo para el rol `superadmin` mediante `RoleGuard` y validación backend.
- Pestañas de inicio, clínicas, administradores de clínica, control SaaS y perfil.
- Alta y edición de clínicas, con bloqueo de doble envío e idempotencia backend.
- Activación y suspensión con confirmación, motivo y cierre de sesiones.
- Gestión de planes, límites, funciones y suscripciones.
- Consulta de alertas, uso por clínica, auditoría, sesiones y estado operativo.
- Operaciones críticas bloqueadas sin conexión; la lectura puede usar la caché segura por usuario existente.
- Limpieza de caché y sesión mediante el flujo global de logout.

## Validaciones automatizadas

- `npx tsc --noEmit`: aprobado.
- `npm run lint`: aprobado tras corregir advertencias del módulo.
- `npx expo-doctor`: 18/18 comprobaciones aprobadas.
- Inicio/exportación Expo: documentado en la evidencia de producción.

## Android físico

La compilación y el arranque de Expo se validan desde desarrollo. La certificación táctil en un teléfono físico requiere ejecutar la matriz descrita en `SUPERADMIN_PRODUCTION_TESTS.md`; no debe registrarse como aprobada sin interacción real en el dispositivo.
