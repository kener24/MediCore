# Flujo FEFO

FEFO significa que se consume primero el lote vigente con fecha de vencimiento mas cercana.

## Seleccion

1. Filtrar por clinica y producto.
2. Excluir lotes inactivos, vencidos o sin saldo.
3. Ordenar por fecha de vencimiento, fecha de recepcion e ID.
4. Consumir el primer lote disponible.
5. Si no alcanza, continuar con el siguiente lote.
6. Crear un movimiento por cada lote utilizado.

Los lotes sin fecha se ordenan despues de los lotes con vencimiento. Si el usuario selecciona un lote explicitamente, el backend vuelve a validar pertenencia, vigencia y saldo.

## Bloqueos

- Un lote vencido nunca se usa para `SALIDA` o consumo clinico.
- Si la suma vigente no alcanza, toda la transaccion se revierte.
- El frontend no es la autoridad: ocultar un lote no sustituye la validacion del backend.

El servicio central es `apps.inventory.services.allocate_fefo_lots`; tambien lo reutiliza el consumo clinico para evitar dos implementaciones diferentes.

