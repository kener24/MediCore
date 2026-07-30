# Certificacion del portal del paciente - Sprint 1.7A

Fecha: 2026-07-30.

## Alcance

Se reviso la implementacion existente del portal web, la API Django REST y la aplicacion Expo. Se reutilizaron los modelos y rutas actuales; no se crearon perfiles, recetas, ordenes, documentos ni pantallas duplicadas.

## Correcciones principales

- La identidad se resuelve exclusivamente desde el usuario autenticado y su perfil `Patient` activo.
- Todos los recursos se filtran por paciente y clinica en el backend.
- Las respuestas publicas de citas, recetas y ordenes omiten identificadores y campos administrativos internos.
- El dashboard y los menus respetan la configuracion habilitada por la clinica.
- La edicion del perfil acepta solo datos de contacto autorizados.
- La solicitud de cita es transaccional e idempotente.
- La reprogramacion actualiza la misma cita y conserva motivo, actor y fecha.
- La cancelacion exige motivo y no elimina el registro.
- Las recetas visibles deben estar emitidas; los borradores permanecen ocultos.
- El historial solo incluye consultas finalizadas y no expone notas privadas.
- Los documentos se consultan y descargan mediante endpoints autenticados.

## Evidencia local

- `python manage.py check`: aprobado.
- Pruebas del sprint: 7/7 aprobadas.
- Pruebas ampliadas de portal, cuentas, citas y documentos: 75/75 aprobadas.
- Suite completa de MediCore: 353/353 aprobadas, con 3 omisiones previstas.
- Build web: aprobado.
- TypeScript movil: aprobado.
- Expo Doctor: 18/18 aprobado.
- Expo/Metro: iniciado con cache limpia en modo LAN y puerto 8081.
- Lint web y movil: cero errores; permanecen advertencias historicas fuera del sprint.

La prueba en Android fisico y las pruebas finales de produccion se registran por separado y no se consideran aprobadas hasta ejecutarlas realmente.
