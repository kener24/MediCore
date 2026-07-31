# PDFs seguros del portal del paciente

## Rutas autorizadas

- Factura: `GET /api/patient-portal/invoices/{id}/pdf/`
- Recibo: `GET /api/patient-portal/payments/{id}/receipt/`
- Nota de crédito: `GET /api/patient-portal/credit-notes/{id}/pdf/`

Las interfaces del paciente no usan las rutas internas de facturación. Cada descarga vuelve a validar sesión, rol, paciente, clínica, configuración, propiedad y estado del documento.

## Respuesta y privacidad

La API entrega `application/pdf`, nombre de archivo seguro y disposición de descarga sin revelar rutas físicas. Los errores ajenos se responden como `403` o `404` sin metadatos del recurso.

## Aplicación móvil

La app descarga con autenticación a un archivo temporal privado cuyo nombre inicia con `medicore-private-`. Después de abrir o compartir, intenta eliminar el temporal. Logout y sesión expirada ejecutan además limpieza de temporales privados y caché del usuario.

Se controlan falta de conexión, expiración de sesión, archivo inexistente, respuesta inválida, descarga interrumpida y error del servidor con un mensaje comprensible y opción de reintento.
