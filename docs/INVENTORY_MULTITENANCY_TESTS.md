# Pruebas multi-clinica de inventario

## Matriz

| Recurso | Usuario de Clinica A sobre Clinica B | Resultado esperado |
| --- | --- | --- |
| Producto | listar, abrir o editar | No aparece / 404 |
| Categoria | editar o desactivar | 404 |
| Lote | crear, abrir o modificar | 400 o 404 |
| Movimiento | listar o crear | No aparece / bloqueado |
| Proveedor | usar en orden A | 400 |
| Orden | abrir, recibir o editar | 404 |
| Recepcion | abrir, revertir o devolver | 404 |
| Alerta | listar | Solo alertas de la propia clinica |

Las consultas se filtran en backend. Manipular un ID no cambia la clinica resuelta desde el usuario autenticado. Los serializers vuelven a verificar relaciones entre categoria/producto, producto/lote y proveedor/orden.

## Pruebas automatizadas

- `apps.inventory.test_sprint15_certification`
- `apps.purchases.test_sprint15_certification`
- `apps.notifications.tests.NotificationTests`
- `apps.inventory.test_sprint15_concurrency` para MySQL

Las pruebas concurrentes usan dos conexiones y verifican que dos salidas no produzcan stock negativo y que dos recepciones no superen el pendiente. Se omiten en SQLite porque ese motor no ofrece el bloqueo por fila que debe certificarse.

