# Evidencia de pruebas en producción

Fecha: 2026-07-21

Este documento se completa únicamente con resultados ejecutados contra `https://kp-software.tech`. No contiene contraseñas, tokens, identificaciones ni datos clínicos sensibles.

| ID | Prueba | Resultado | Evidencia segura |
| --- | --- | --- | --- |
| PROD-01 | Respaldo/estado previo del servidor | Pendiente | Se registrará antes del despliegue |
| PROD-02 | `git pull` y versión desplegada | Pendiente | Commit desplegado |
| PROD-03 | Migraciones y `manage.py check` | Pendiente | Salida resumida |
| PROD-04 | Build web de producción | Pendiente | Hash de assets y resultado |
| PROD-05 | Reinicio Gunicorn y estado activo | Pendiente | Estado del servicio |
| PROD-06 | `nginx -t` y recarga | Pendiente | Resultado de configuración |
| PROD-07 | HTTPS y pantalla de login | Pendiente | Código HTTP y navegador |
| PROD-08 | Login de Clínica A | Pendiente | Rol y clínica, sin credenciales |
| PROD-09 | Login de Clínica B | Pendiente | Rol y clínica, sin credenciales |
| PROD-10 | Recurso propio visible | Pendiente | Endpoint anonimizado |
| PROD-11 | Recurso de otra clínica bloqueado | Pendiente | Código 403/404 |
| PROD-12 | Ruta web no autorizada | Pendiente | Redirección a `/forbidden` |
| PROD-13 | Logout y reutilización bloqueada | Pendiente | Códigos HTTP |
| PROD-14 | Inicio de Expo contra API HTTPS | Pendiente | URL de Metro y API configurada |

## Política de evidencia

- Las capturas no deben mostrar tokens, contraseñas ni información clínica real.
- Una prueba pendiente no se marca como aprobada por inferencia.
- Android físico se registra por separado como “Pendiente de prueba física” hasta usar Expo Go en un teléfono.

