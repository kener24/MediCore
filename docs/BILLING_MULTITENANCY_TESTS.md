# Pruebas multi-clinica de facturacion

## Escenarios certificados

Con Clinica A y Clinica B se verifico que un usuario de A no puede:

- pagar una factura de B;
- cerrar una caja de B;
- descargar una factura o recibo de B;
- asociar una sesion de caja ajena;
- generar una factura para una visita de B;
- reutilizar referencias de origen entre contextos.

Los intentos con ID manipulado responden 404 o 403 sin revelar datos. Las relaciones `Payment`, `CashMovement`, `InvoiceItem` y `CashSession` validan coherencia de clinica en backend.

El portal paciente consulta por el paciente autenticado, clinica, estado aplicado y recurso activo. La prueba automatizada confirma que un paciente descarga su recibo y recibe 404 al intentar abrir el de otro paciente.

Cobertura principal: `apps/billing/test_sprint14_certification.py`.
