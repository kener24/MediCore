# Plan de capacidad

## Estado medido

- 2 vCPU, 1.9 GiB RAM, 2 GiB swap y 58 GiB de disco.
- Disco usado: 6.9 GiB (12%); libre: 51 GiB.
- Gunicorn: 3 workers, aproximadamente 233 MiB totales.
- MySQL: aproximadamente 519 MiB RSS; buffer pool 128 MiB.
- Datos: 7 clínicas, 52 usuarios, 66 pacientes, 229 citas, 159 consultas, 152 facturas.
- MySQL: 7.88 MiB; media: pequeña en el conjunto actual.

La carga de 10 concurrentes no produjo errores, pero llevó CPU cerca del límite. La instancia es adecuada para el volumen demo/operación inicial y no debe venderse como capacidad ilimitada.

## Señales para escalar

- CPU mayor a 70% sostenida o p95 mayor a 750 ms en endpoints simples.
- Memoria disponible menor a 250 MiB o uso sostenido de swap.
- Disco mayor a 70% o crecimiento que reduzca a menos de seis meses de margen.
- Conexiones DB, locks o slow queries en crecimiento.
- Backups/reportes que excedan la ventana operativa.
- Media clínica que deje de ser razonable en disco local.

Orden recomendado: aumentar plan Lightsail; mover media a almacenamiento de objetos cifrado; separar MySQL; luego evaluar Redis, workers dedicados, CDN o múltiples instancias solo con nueva medición.
