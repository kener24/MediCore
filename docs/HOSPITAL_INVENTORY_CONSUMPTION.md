# Consumo de inventario hospitalario

## Regla central

Todo consumo real utiliza `consume_inventory_item`. El servicio bloquea el producto, valida clínica y cantidad, y delega la selección de lotes a la asignación FEFO existente.

## FEFO y lotes

- Se usa primero el lote vigente con vencimiento más próximo.
- Se excluyen lotes vencidos, sin existencia o de otra clínica.
- Una cantidad puede dividirse entre varios lotes.
- Cada fracción crea su consumo y movimiento correspondiente.
- No se permite stock negativo.

La administración de medicamento queda vinculada a los consumos mediante `medication_administration`. Los insumos no farmacológicos se vinculan al internamiento mediante `hospitalization`.

## Idempotencia y reversión

El consumo acepta una clave única por clínica. Para medicamentos se deriva de la administración, por lo que un reintento nunca vuelve a descontar. Una reversión cancela cada consumo y restaura exactamente los lotes utilizados; no selecciona lotes nuevos.

