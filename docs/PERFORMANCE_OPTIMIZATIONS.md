# Optimizaciones de rendimiento

Fecha de cierre: 2026-08-04.

| Área | Problema medido | Cambio | Resultado | Riesgo |
|---|---|---|---|---|
| Superadmin | Agregación cartesiana; p50 2,214 ms | Subconsultas correlacionadas por clínica | p50 56 ms | Bajo; mismas reglas multi-clínica |
| Dashboard clínica | 47 consultas | Agregaciones consolidadas | 33 consultas | Bajo |
| Citas | Configuración consultada por objeto | Caché acotada por clínica | 9 a 4 consultas | Bajo; clave aislada por clínica |
| Hospitalización | Acceso repetido a asignación de cama | Uso de relación precargada | Costo constante | Bajo |
| Caja | Agregados repetidos por sesión | Precarga y suma controlada | Costo constante por sesión | Bajo |
| Portal paciente | Pagos y notas consultados por factura | `Prefetch` filtrado | Menos N+1 sin ampliar visibilidad | Bajo |
| Frontend | Chunk inicial de 1,017.22 kB | Rutas con `React.lazy` y vendors estables | Código propio 250.33 kB; agregado inicial 548.04 kB, -46.1% | Bajo; build y navegación compilados |

La paginación conserva el arreglo JSON usado por web y móvil. Publica metadatos en cabeceras, usa 50 filas por defecto y limita a 200. No se agregó caché global, Redis ni procesamiento asíncrono porque la medición actual no lo justifica.

Los endpoints privados mantienen autenticación, permisos y filtro por clínica. Las optimizaciones no eliminan controles de acceso ni convierten consultas multi-clínica en consultas globales.
