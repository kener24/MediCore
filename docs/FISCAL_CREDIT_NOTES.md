# Notas de credito fiscales

Fecha: 2026-07-07

## Objetivo

Permitir anular fiscalmente una factura emitida sin borrar la factura original ni alterar su numero fiscal, generando una nota de credito relacionada y auditable.

## Diferencia entre anulacion simple y anulacion fiscal

- Factura no fiscal: puede anularse por el flujo normal de factura.
- Factura fiscal emitida: se anula mediante `void-fiscal`, generando una nota de credito fiscal relacionada.

## Modelo usado

`CreditNote`

Controla:

- Clinica.
- Factura original.
- Numero interno de nota.
- Numero fiscal de nota.
- CAI y rango usado.
- Fecha limite.
- Motivo.
- Totales copiados de la factura.
- Usuario emisor.
- Estado y auditoria.

## Rango fiscal

Las notas de credito usan `FiscalDocumentRange.document_type = credit_note`.

No reutilizan correlativos de factura.

## Endpoints

- `POST /api/billing/invoices/{id}/void-fiscal/`
- `GET /api/billing/credit-notes/`
- `GET /api/billing/credit-notes/{id}/`
- `GET /api/billing/credit-notes/{id}/pdf/`
- `GET /api/patient-portal/credit-notes/{id}/pdf/`

## Impacto en pagos

Los pagos existentes no se borran ni se editan. Si una factura tiene pagos, el sistema genera la nota de credito y muestra advertencia de que la devolucion debe gestionarse manualmente.

Pendiente futuro:

- Flujo formal de reembolso.
- Saldo a favor del paciente.
- Aplicacion de credito a facturas futuras.

## Auditoria

Se audita:

- Intento fallido de anulacion fiscal.
- Anulacion fiscal exitosa.
- Emision de nota de credito.
- Descarga de PDF de nota de credito.

## Advertencia fiscal

Este flujo es una base tecnica. Debe validarse con contador o asesor fiscal hondureno antes de usarse para facturacion real.
