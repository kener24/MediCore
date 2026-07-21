# Matriz de pruebas multi-clínica

Fecha de ejecución: 2026-07-21

Entorno: base temporal creada por Django TestCase. Se usaron Clínica A y Clínica B con usuarios y recursos sintéticos. No se modificaron datos fiscales ni registros reales.

| Recurso | Listado A/B | Detalle cruzado | Creación con ID ajeno | Edición con ID ajeno | Acción/descarga cruzada | Estado |
| --- | --- | --- | --- | --- | --- | --- |
| Usuarios de clínica | Filtrado por clínica | 404 | Rol y clínica validados | 404 | Sesiones limitadas por ámbito | Aprobado |
| Pacientes | Filtrado por clínica | 404 | Clínica impuesta por backend | 404 | Historial cruzado bloqueado | Aprobado |
| Citas | Filtrado por clínica | 404 | Paciente y médico validados | Movimiento a otra clínica rechazado | Acciones y disponibilidad validadas | Aprobado |
| Admisiones/visitas | Filtrado por clínica | 404 | Paciente validado | Recurso ajeno no disponible | Triaje y flujo usan visita del queryset | Aprobado |
| Documentos | Filtrado por clínica | 404 | Relaciones clínicas validadas | Recurso ajeno no disponible | Descarga de otra clínica responde 404 | Aprobado |
| Facturas | Filtrado por clínica | 404 | Paciente/visita/consulta validados | Recurso ajeno no disponible | Pagos y acciones usan factura del queryset | Aprobado |
| Expedientes/consultas | Filtrado por clínica | 404 | Relaciones validadas | Médico propietario requerido | Superadmin y paciente no mutan contenido clínico | Aprobado |
| Diagnósticos/recetas/órdenes | Filtrado por clínica y propietario | 404 | Consulta de otra clínica rechazada | Médico propietario requerido | Anulación/cancelación no autorizada responde 403 | Aprobado |
| Hospitalización | Filtrado por clínica | Recurso ajeno no disponible | Paciente/cama de clínica validados | Recurso ajeno no disponible | Superadmin bloqueado | Aprobado |

## Evidencia automatizada

- Batería de autenticación, aislamiento y recursos principales: 136/136 pruebas aprobadas.
- Suite completa final: 249/249 pruebas aprobadas.
- La suite clínica posterior incluye regresiones de mutaciones y acceso de superadmin; su resultado se registra en `CERTIFICATION_ROLES_AND_CLINICS.md`.
- Los casos se ejecutan con base de datos de prueba y son repetibles; no requieren un seed en producción.

## Fugas encontradas y corregidas

1. El superadmin podía listar pacientes y citas clínicas identificables.
2. Una cita podía intentar moverse a paciente o médico de otra clínica durante edición.
3. Acciones personalizadas de citas no validaban todos los roles de forma uniforme.
4. Algunas mutaciones de consultas, diagnósticos, recetas y órdenes confiaban solo en el queryset y no repetían el control de propietario.
5. Rutas web heredadas de usuarios, roles y clínicas tenían sesión, pero no guard de superadmin.
