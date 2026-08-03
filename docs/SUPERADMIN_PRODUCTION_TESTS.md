# Pruebas de producción del superadministrador

Usar únicamente clínicas y cuentas demo.

## Web y API

1. Iniciar sesión como superadmin y abrir dashboard, clínicas, planes, suscripciones, operación y auditoría.
2. Crear una clínica demo y repetir el envío: debe existir una sola.
3. Verificar configuración, workflow y suscripción inicial.
4. Suspender Clínica A con motivo; Admin A pierde acceso.
5. Confirmar que Clínica B continúa operativa.
6. Reactivar A; el token viejo sigue inválido y un login nuevo funciona.
7. Reducir el plan A: no se eliminan usuarios y se muestra sobreuso.
8. Intentar abrir paciente, consulta, receta, hospitalización y documento: debe bloquearse.
9. Verificar auditoría y que no incluya secretos ni contenido clínico.

## Android físico

Probar login/restauración, las cinco pestañas, búsqueda, alta idempotente, edición, suspensión, planes, suscripción, uso, alertas, sesiones, offline, reconexión, expiración, botón atrás, teclado, pantalla pequeña y logout. Registrar dispositivo, versión, fecha, resultado y evidencia. Expo web o una exportación estática no sustituyen esta prueba.

## Criterio

No aprobar producción si falla aislamiento multi-clínica, revocación de sesiones, idempotencia, privacidad clínica, compilación o navegación por rol.
