# Auditoría de índices MySQL

Fecha: 2026-08-04.

La base de producción tiene 77 tablas y ocupaba aproximadamente 7.88 MiB durante la auditoría. MySQL no mostraba consultas lentas, espera de bloqueos ni presión de conexiones; el máximo observado fue 3 de 151 conexiones.

Se revisaron filtros frecuentes por clínica, estado, fecha, paciente, médico, factura, producto, lote, hospitalización y número fiscal. Las restricciones e índices existentes cubren los recorridos críticos actuales. La consulta lenta del dashboard superadmin no se resolvía agregando un índice: el problema era la multiplicación de filas por varios `JOIN`, corregida en ORM mediante subconsultas.

## Decisión

- Índices agregados: ninguno.
- Índices descartados: adiciones masivas sobre campos aislados ya cubiertos o tablas pequeñas.
- Motivo: no existe evidencia de `full scan` costoso que compense más almacenamiento y costo de escritura.
- Próxima revisión: al superar 100,000 citas/facturas o si el log lento registra consultas mayores a 750 ms de forma sostenida.

MySQL advierte que no implementa restricciones únicas condicionales de Django. Los flujos financieros, fiscales, inventario y camas conservan transacciones y bloqueos de fila; esta limitación debe seguirse en cada migración.
