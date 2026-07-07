# Auditoria fiscal base MediCore

Fecha: 2026-07-07

## Alcance

Sprint 1A: cierre fiscal base para emision segura de factura fiscal. No incluye nota de credito ni rehacer el modulo de facturacion.

## Modelos existentes reutilizados

- `ClinicFiscalProfile`: configuracion fiscal por clinica, razon social, RTN, direccion, telefono, correo, municipio, departamento, ISV, leyenda y habilitacion fiscal.
- `FiscalDocumentRange`: CAI y rango autorizado por clinica y tipo de documento, con establecimiento, punto de emision, correlativo actual, fecha limite, estado activo y agotado.
- `Invoice`: factura con campos fiscales, numero fiscal, CAI, rango, emisor, cliente, totales separados, estado fiscal y bloqueo de edicion al emitir.
- `InvoiceItem`: detalle con tipo de impuesto, tasa, descuento, subtotal, impuesto y total.
- `AuditLog`: auditoria central para cambios de perfil, rangos, emision, anulacion, impresion y descarga.

No se crearon modelos duplicados.

## Endpoints fiscales existentes o corregidos

- `GET/PATCH /api/billing/fiscal-profile/`
- `GET/POST/PATCH /api/billing/fiscal-ranges/`
- `GET /api/billing/fiscal-readiness/`
- `POST /api/billing/invoices/{id}/issue-fiscal/`
- `POST /api/billing/invoices/{id}/cancel-fiscal/`
- `GET /api/billing/invoices/{id}/fiscal-print-data/`
- `GET /api/billing/invoices/{id}/fiscal-pdf/`

## Pantallas web existentes

- `/clinic/settings/fiscal`: perfil fiscal y rangos CAI.
- Detalle de factura: emision fiscal, anulacion fiscal y descarga de PDF fiscal.
- Impresion de factura: plantilla fiscal/normal reutilizando datos dinamicos.

## Que funciona

- La clinica tiene perfil fiscal independiente.
- El rango CAI es por clinica.
- La emision fiscal usa transaccion y `select_for_update`.
- No se emite sin perfil fiscal habilitado.
- No se emite sin rango activo.
- No se emite con rango vencido.
- No se emite con rango agotado.
- No se emite dos veces la misma factura.
- No se permite emitir facturas de otra clinica.
- El PDF fiscal requiere factura fiscal emitida o anulada.
- El PDF fiscal no cruza clinicas porque usa el queryset filtrado por rol.
- La auditoria registra emision, errores de emision, anulacion, impresion y descarga.

## Que estaba incompleto y se corrigio

- Faltaba endpoint de estado fiscal previo a la emision: se agrego `/api/billing/fiscal-readiness/`.
- El frontend emitia sin consultar readiness: ahora consulta el estado fiscal antes de confirmar.
- La respuesta de emision no tenia mensaje de exito controlado: ahora incluye `success`, `invoice_id` y `message`, sin romper el objeto factura.
- Los roles de emision fiscal se ampliaron para cubrir `recepcionista_caja` y `cajero` cuando existan en la instalacion.

## Riesgos actuales

- La configuracion fiscal debe ser validada por contador o asesor fiscal hondureno antes de uso real.
- Los textos fiscales/leyendas deben configurarse por clinica; el sistema no inventa textos legales.
- Se recomienda probar en MySQL productivo con concurrencia real antes de operar facturacion fiscal masiva.

## Estado de anulacion fiscal y nota de credito

Sprint 1B agrego un flujo controlado de anulacion fiscal mediante nota de credito.

Existe:

- `Invoice` conserva numero fiscal, CAI, rango y fecha original.
- `FiscalDocumentRange` ya soportaba `credit_note`, por lo que se reutilizo para correlativos de nota de credito.
- `CreditNote` registra documento fiscal relacionado con la factura original.
- `POST /api/billing/invoices/{id}/void-fiscal/` anula fiscalmente y genera nota de credito.
- `GET /api/billing/credit-notes/` lista notas de credito por clinica.
- `GET /api/billing/credit-notes/{id}/pdf/` descarga PDF seguro.
- Portal paciente expone estado de factura anulada y PDF seguro de la nota.

Decisiones tecnicas:

- No se borra la factura original.
- No se modifica el numero fiscal ni CAI original.
- La nota de credito usa rango fiscal `credit_note`.
- La anulacion requiere motivo obligatorio.
- Pagos aplicados se conservan; la devolucion queda como gestion manual pendiente.
- `cancel-fiscal` se mantiene como alias compatible, pero usa el flujo nuevo con nota de credito.

Riesgos:

- El flujo debe revisarse con contador hondureno antes de uso fiscal real.
- Queda pendiente un modulo formal de devoluciones/saldos a favor.
