# Flujo de notificaciones del paciente

## Bandeja y estado de lectura

La bandeja lista solo notificaciones del usuario paciente y de su clínica activa. Excluye notificaciones expiradas. El contador no leído usa una consulta agregada y se actualiza al abrir la bandeja, refrescar, marcar una notificación o marcar todas.

Rutas certificadas:

- `GET /api/patient-portal/notifications/`
- `GET /api/patient-portal/notifications/unread-count/`
- `PATCH /api/patient-portal/notifications/{id}/mark-read/`
- `PATCH /api/patient-portal/notifications/mark-all-read/`
- `GET/PATCH /api/patient-portal/notification-preferences/`

Marcar como leída es idempotente. Marcar todas solo afecta al usuario autenticado y su clínica.

## Destinos internos

Los destinos permitidos se transforman a rutas internas conocidas para citas, recetas, órdenes, documentos, facturas y pagos. No se abren URLs externas arbitrarias. El recurso de destino siempre vuelve a validar propiedad en backend.

## Contenido seguro

La notificación muestra título, resumen, tipo, fecha y estado. El push evita incluir contenido clínico o financiero sensible; el detalle completo se consulta dentro de la aplicación autenticada.
