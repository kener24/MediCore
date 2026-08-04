# Plan de pruebas de carga

La herramienta `deploy/load/medicore_load_test.py` ejecuta únicamente GET y alterna rutas configuradas. Puede autenticarse con una cuenta de prueba sin imprimir credenciales.

## Fases

1. Local: 5, 10, 25 y 50 concurrentes sobre health/readiness.
2. Producción: máximo 5 y 10 concurrentes, en ventana controlada.
3. Autenticado en entorno aislado: recepción, médico, enfermería, caja, paciente y administración.
4. Concurrencia de escritura: solo pruebas transaccionales dedicadas sobre base temporal.

Se detiene ante errores. La herramienta bloquea más de 10 concurrentes contra host no local salvo habilitación explícita. Nunca debe repetirse pago, emisión fiscal, consumo, check-in o medicación real como prueba genérica.

Métricas: RPS, p50, p95, p99, errores, CPU, memoria, swap y estado de servicios. Para endpoints simples, el objetivo inicial es cero errores y p95 menor a 750 ms con 5 concurrentes; los límites se ajustan con datos reales.
