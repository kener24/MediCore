# Métricas globales seguras

`GET /api/admin/dashboard/` calcula agregados en backend para hoy, 7 días, 30 días, mes actual o un rango personalizado de hasta 366 días.

Incluye conteos de clínicas, usuarios por rol, citas, consultas, facturas, hospitalizaciones activas, suscripciones, distribución por plan y alertas. Las consultas usan `Count`, filtros por fecha y agregaciones; no descargan colecciones completas al móvil.

`GET /api/admin/usage/` presenta consumo y límites por clínica. `GET /api/admin/alerts/` presenta alertas administrativas deduplicadas por código y clínica.

Uso y alertas se resuelven con una consulta agregada, incluidos administradores activos, usuarios, médicos, pacientes y citas del mes. Una prueba de regresión verifica que no reaparezca un patrón N+1.

No se devuelven nombres de pacientes, diagnósticos, recetas, notas, documentos ni contenido clínico. No se publican métricas financieras SaaS porque MediCore aún no registra cobros reales de suscripción.
