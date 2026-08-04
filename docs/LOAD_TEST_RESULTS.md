# Resultados de carga y concurrencia

Fecha: 2026-08-04.

## Producción, solo lectura

Ruta `/health/ready/` sobre HTTPS:

| Concurrencia | Solicitudes | Errores | RPS | p50 | p95 | p99 |
|---:|---:|---:|---:|---:|---:|---:|
| 5 | 50 | 0 | 16.24 | 260 ms | 473 ms | 596 ms |
| 10 | 100 | 0 | 28.81 | 326 ms | 403 ms | 524 ms |

Durante la fase de 10 concurrentes la CPU llegó brevemente a 96%, sin I/O wait, sin intercambio adicional y con memoria libre estable en aproximadamente 326 MiB más caché recuperable. No se aumentó a 25/50 en producción.

## Local, solo lectura

| Concurrencia | Solicitudes | Errores | RPS | p50 | p95 |
|---:|---:|---:|---:|---:|---:|
| 5 | 25 | 0 | 42.84 | 35 ms | 422 ms |
| 10 | 50 | 0 | 166.53 | 52 ms | 75 ms |
| 25 | 125 | 0 | 110.08 | 84 ms | 1,012 ms |
| 50 | 250 | 0 | 115.70 | 74 ms | 1,560 ms |

## Concurrencia de escritura aislada

Tres pruebas MySQL terminaron correctamente en 9.531 s: consumo/recepción de inventario y asignación de cama. No hubo stock negativo ni cama doble. Los flujos de pago, correlativo fiscal, check-in y medicación conservan `transaction.atomic()`/`select_for_update()` y pasaron regresión funcional, pero no todos recibieron una carrera multihilo independiente en este cierre; se mantienen como prueba pendiente de endurecimiento, sin ejecutar escrituras destructivas en producción.
