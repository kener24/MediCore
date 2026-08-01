# Alertas operativas del administrador de clinica

`GET /api/clinic-admin/alerts/` calcula alertas reales y aisladas por clinica sobre inventario, lotes, bloqueos, cajas prolongadas, diferencias, esperas y preparacion fiscal.

Cada alerta incluye severidad, categoria, cantidad, detalle y tipo de recurso, sin datos clinicos ni fiscales sensibles. La pantalla permite filtrar criticas y advertencias, actualizar con gesto y manejar estado vacio/error.

Las alertas actuales son derivadas del estado del sistema: no admiten reconocimiento manual. Se cierran al corregir la causa. No se creo un falso boton de “resolver”. Alertas persistentes con asignacion y seguimiento quedan como posible alcance de Sprint 1.8B.
