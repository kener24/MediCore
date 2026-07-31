# Certificación financiera del portal del paciente - Sprint 1.7B

## Alcance

Se reutilizaron `Invoice`, `InvoiceItem`, `Payment`, `CreditNote` y la configuración existente del portal. No se creó una facturación paralela. El portal es de consulta: el paciente no registra pagos, anula facturas ni modifica información fiscal.

## Flujo certificado

1. La API resuelve al paciente desde el usuario autenticado.
2. Facturas, pagos y notas de crédito se filtran por paciente y clínica.
3. El backend entrega subtotal, descuentos, impuestos, total, monto pagado y saldo como fuente de verdad.
4. El detalle público omite caja, arqueos, usuarios internos, auditoría y otros metadatos operativos.
5. Facturas anuladas permanecen en el historial y muestran su nota de crédito relacionada.
6. PDFs y recibos se obtienen por rutas autenticadas del portal paciente.

## Endpoints públicos del paciente

- `GET /api/patient-portal/invoices/`
- `GET /api/patient-portal/invoices/{id}/`
- `GET /api/patient-portal/invoices/{id}/pdf/`
- `GET /api/patient-portal/payments/`
- `GET /api/patient-portal/payments/{id}/`
- `GET /api/patient-portal/payments/{id}/receipt/`
- `GET /api/patient-portal/credit-notes/`
- `GET /api/patient-portal/credit-notes/{id}/`
- `GET /api/patient-portal/credit-notes/{id}/pdf/`

Una manipulación de identificadores ajenos devuelve `403` o `404` sin exponer nombre, monto, clínica, fecha ni número del recurso.

## Resultado

Backend, web y móvil consumen los mismos valores financieros seguros. Las pruebas automatizadas cubren propiedad, configuración del portal, recursos propios, recursos ajenos, PDFs y recibos.
