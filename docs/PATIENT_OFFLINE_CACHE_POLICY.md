# Política de caché offline del paciente

## Datos permitidos

La app puede conservar la última respuesta de lectura para dashboard, perfil, citas, recetas, órdenes, documentos, facturas, pagos y notificaciones. La interfaz identifica que la información puede estar desactualizada y ofrece reintento.

No se permiten offline acciones clínicas o financieras, cancelación o reprogramación, marcación de notificaciones ni descargas que no existan localmente.

## Aislamiento

Las claves privadas incorporan usuario, paciente o sesión, clínica, recurso y filtros disponibles. Al cerrar sesión o expirar, se eliminan caché privada, notificaciones, borradores y archivos temporales. Un usuario nuevo no reutiliza la caché del anterior.

## Conectividad y errores

La capa común distingue sin conexión, timeout, servidor no disponible, validación, `401`, `403`, `404` y `409`. No muestra `AxiosError`, HTML, JSON crudo, tokens ni encabezados. Cuando regresa internet, las lecturas pueden refrescarse; las operaciones críticas inciertas nunca se repiten automáticamente.
