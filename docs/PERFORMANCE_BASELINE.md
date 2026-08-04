# Línea base y optimizaciones de rendimiento

Medición local con datos demo realistas, siete muestras posteriores al calentamiento por endpoint. Los tiempos incluyen autenticación, permisos y auditoría. La base local usa SQLite; producción usa MySQL, por lo que se comparan tendencias y número de consultas, no equivalencia absoluta.

## Antes

| Endpoint | Queries | p50 | p95 | Respuesta |
|---|---:|---:|---:|---:|
| Dashboard superadmin | 11 | 2,214 ms | 2,546 ms | 749 B |
| Dashboard clínica | 47 | 116 ms | 129 ms | 1,895 B |
| Citas | 9 | 71 ms | 85 ms | 22,237 B |
| Cola de triaje | 9 | 49 ms | 49 ms | 7,881 B |
| Hospitalizaciones | 6 | 12 ms | 52 ms | 735 B |
| Facturas de paciente | 15 | 24 ms | 24 ms | 734 B |
| Citas de paciente | 14 | 21 ms | 21 ms | 3,586 B |

Bundle web inicial: 1,017.22 kB (260.08 kB gzip).

## Después

| Endpoint | Queries | p50 | Resultado |
|---|---:|---:|---|
| Dashboard superadmin | 11 | 56 ms | Agregación cartesiana eliminada con subconsultas correlacionadas |
| Dashboard clínica | 33 | 125 ms | 14 consultas menos; agregaciones consolidadas |
| Citas | 4 | 83 ms | N+1 de configuración eliminado; paginación agrega una consulta COUNT |
| Facturas de paciente | 14 | 71 ms | Nota de crédito precargada; costo fijo de seguridad/auditoría permanece |
| Citas de paciente | 12 | 78 ms | Caché por clínica aplicado |

El middleware de observabilidad y la paginación introducen costo fijo en la prueba local; por eso algunos tiempos absolutos aumentan aunque las consultas disminuyen. En producción, el beneficio principal es que el costo ya no crece por cada fila.

Bundle inicial después: 531.35 kB (162.53 kB gzip), reducción de 47.8% sin quitar funcionalidad. Facturación, hospitalización, portal, reportes y demás módulos se descargan al entrar a su ruta.

## Carga local controlada

Prueba de liveness/readiness con cinco solicitudes por worker, sin escrituras:

| Concurrencia | Solicitudes | Errores | RPS | p50 | p95 |
|---:|---:|---:|---:|---:|---:|
| 5 | 25 | 0 | 42.84 | 35 ms | 422 ms |
| 10 | 50 | 0 | 166.53 | 52 ms | 75 ms |
| 25 | 125 | 0 | 110.08 | 84 ms | 1,012 ms |
| 50 | 250 | 0 | 115.70 | 74 ms | 1,560 ms |

El servidor de desarrollo local no representa los tres workers Gunicorn, pero certifica ausencia de errores hasta 50 hilos. La saturación visible desde 25 concurrentes justifica conservar la prueba de producción en 5/10 y medir endpoints autenticados por rol fuera de horario antes de aumentar capacidad.

## Decisiones

- Paginación por defecto: 50; máximo solicitado: 200. Se conserva el arreglo JSON existente y se publican `X-Total-Count`, `X-Page`, `X-Page-Size` y `X-Total-Pages`.
- No se añadieron índices a ciegas. La base ocupa 7.88 MiB, no presenta slow queries ni esperas de bloqueo, y los índices compuestos principales ya existen. Añadir índices ahora aumentaría escrituras sin beneficio medido.
- No se agregó caché distribuida. Los dashboards optimizados son suficientemente rápidos para la carga actual.
- Los reportes mantienen límites sincrónicos existentes; las exportaciones masivas deben tratarse como trabajo futuro si el volumen real supera esos límites.
