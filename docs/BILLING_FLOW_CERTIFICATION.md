# Certificacion del flujo de facturacion

## Alcance

Sprint 1.4 certifica el flujo existente sin duplicar modelos, pantallas ni endpoints. Se reutilizan `PatientVisit`, `ClinicalConsultation`, `BillableService`, `ClinicalSupplyUsage`, `Invoice`, `InvoiceItem`, `Payment`, `CashSession`, `CashMovement`, perfil fiscal, rangos CAI y auditoria.

## Flujo certificado

1. La consulta finalizada deja la visita pendiente de facturacion.
2. `POST /api/billing/visits/{visit_id}/generate-invoice/` crea o recupera la misma factura.
3. La consulta y los consumos facturables se agregan con `source_type` y `source_id`; recetas u ordenes no ejecutadas no generan cargos.
4. Backend calcula con `Decimal` subtotal, descuentos, impuestos, total, pagado y saldo.
5. Los pagos parciales mantienen la factura en `parcialmente_pagada` y la visita en `waiting_payment`.
6. Saldo cero cambia la factura a `pagada`; la visita solo se completa con consulta finalizada y conforme a `ClinicWorkflowSettings`.

## Garantias

- Una repeticion recupera la factura y no duplica conceptos.
- Una factura con pagos no permite modificar conceptos criticos.
- Solo administracion de clinica puede aplicar descuentos.
- Efectivo requiere caja abierta; tarjeta y transferencia no aumentan efectivo fisico.
- No se admite pago mayor al saldo ni pago de factura anulada.
- Todos los querysets operativos se limitan a la clinica autenticada.

## Fuera de alcance

Pagos mixtos atomicos, pasarela, reembolsos bancarios, seguros y credito avanzado quedan para otro sprint.
