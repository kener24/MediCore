# Mapa de API fiscal

Fecha: 2026-07-07

## Configuracion fiscal

| Metodo | Endpoint | Uso |
| --- | --- | --- |
| GET | `/api/billing/fiscal-profile/` | Obtener perfil fiscal de la clinica del usuario. |
| PATCH | `/api/billing/fiscal-profile/` | Actualizar perfil fiscal de la clinica. |
| GET | `/api/billing/fiscal-ranges/` | Listar rangos fiscales de la clinica. |
| POST | `/api/billing/fiscal-ranges/` | Crear rango CAI. |
| PATCH | `/api/billing/fiscal-ranges/{id}/` | Activar, desactivar o ajustar rango. |
| GET | `/api/billing/fiscal-readiness/` | Validar si la clinica puede emitir factura fiscal. |

## Facturas fiscales

| Metodo | Endpoint | Uso |
| --- | --- | --- |
| POST | `/api/billing/invoices/{id}/issue-fiscal/` | Emitir factura fiscal. |
| POST | `/api/billing/invoices/{id}/void-fiscal/` | Anular factura fiscal emitida mediante nota de credito. |
| POST | `/api/billing/invoices/{id}/cancel-fiscal/` | Alias compatible para anulacion fiscal mediante nota de credito. |
| GET | `/api/billing/invoices/{id}/fiscal-print-data/` | Obtener datos fiscales para impresion. |
| GET | `/api/billing/invoices/{id}/fiscal-pdf/` | Descargar PDF fiscal. |

## Notas de credito

| Metodo | Endpoint | Uso |
| --- | --- | --- |
| GET | `/api/billing/credit-notes/` | Listar notas de credito de la clinica. |
| GET | `/api/billing/credit-notes/{id}/` | Ver detalle de nota de credito. |
| GET | `/api/billing/credit-notes/{id}/pdf/` | Descargar PDF de nota de credito. |
| GET | `/api/patient-portal/credit-notes/{id}/pdf/` | Descargar PDF de nota de credito del paciente autenticado. |

## Respuesta de readiness

```json
{
  "ready": true,
  "status": "ready",
  "missing_fields": [],
  "message": "La clinica esta lista para emitir facturas fiscales.",
  "active_range": {
    "full_start_number": "000-001-01-00000001",
    "full_end_number": "000-001-01-00000100"
  }
}
```

Estados posibles:

- `disabled`
- `missing_profile`
- `incomplete_profile`
- `missing_range`
- `incomplete_range`
- `expired_range`
- `exhausted_range`
- `ready`
