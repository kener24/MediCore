# Seguridad de documentos del paciente

Las rutas de listado, detalle, vista previa y descarga validan sesion, rol paciente, perfil activo, clinica activa, suscripcion, configuracion del portal, propiedad, visibilidad y estado activo del documento.

Cambiar manualmente el ID de un documento ajeno, oculto o de otra clinica devuelve 404 sin revelar metadatos. La aplicacion movil descarga con JWT y clave de sesion hacia el cache privado y comparte o abre el archivo desde una copia temporal; ya no depende de una URL protegida abierta sin encabezados.

Las consultas y descargas quedan auditadas. Al cerrar sesion deben limpiarse los datos de autenticacion; los archivos temporales no se consideran almacenamiento clinico permanente.
