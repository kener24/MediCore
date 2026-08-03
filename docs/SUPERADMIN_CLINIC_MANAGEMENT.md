# Gestión de clínicas por superadministrador

## Alta segura

La creación reutiliza `Clinic`, `ClinicSettings`, `ClinicWorkflowSettings`, `ClinicSubscription` y `User`. Se ejecuta dentro de `transaction.atomic()` y crea configuración, flujo y suscripción de forma conjunta. Si falla el administrador inicial o el plan, no queda una clínica parcial.

`Idempotency-Key` evita duplicados por doble toque o reintento. Una huella normalizada de nombre, RTN y correo también bloquea reenvíos equivalentes con otra clave.

## Consulta

El listado presenta únicamente información administrativa: identidad de la clínica, contacto, estado, plan, suscripción y conteos agregados. Admite búsqueda y filtros de estado, plan y suscripción.

## Ciclo de estado

- Activar: exige motivo y suscripción válida.
- Suspender: exige motivo, conserva todos los datos y revoca las sesiones de sus usuarios.
- Reactivar: conserva usuarios e historial, pero no revive sesiones anteriores.
- Eliminar físicamente: no existe en la API ni en la aplicación móvil.

Cada cambio registra actor, clínica, antes/después, motivo, IP, agente y fecha mediante la auditoría existente.
