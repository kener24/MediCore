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
| POST | `/api/billing/invoices/{id}/cancel-fiscal/` | Anular factura fiscal emitida. |
| GET | `/api/billing/invoices/{id}/fiscal-print-data/` | Obtener datos fiscales para impresion. |
| GET | `/api/billing/invoices/{id}/fiscal-pdf/` | Descargar PDF fiscal. |

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
