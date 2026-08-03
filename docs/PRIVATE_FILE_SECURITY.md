# Seguridad de archivos privados

- Extensiones permitidas configurables; ejecutables y scripts bloqueados.
- Tamaño máximo configurable, nombre aleatorio seguro y firma real/MIME comprobados.
- Relaciones de paciente, consulta, orden y factura deben pertenecer a la misma clínica.
- Listado, detalle, preview y download pasan por autenticación y autorización por objeto.
- Nginx no publica `/media/`; responde 404. La app descarga con JWT y sesión a caché temporal y elimina al compartir/logout.

Pendiente reconocido: no hay motor antivirus/antimalware. No se afirma lo contrario.
