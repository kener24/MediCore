# Recetas y ordenes del paciente

## Recetas

Solo se muestran recetas propias, de la misma clinica, activas y emitidas. El serializer publico omite paciente, consulta, usuarios emisores, revisiones internas de alergias y motivos internos. El PDF se obtiene por una ruta autenticada propia del portal y registra auditoria de descarga.

## Ordenes

Las ordenes se limitan al paciente, clinica y atenciones autorizadas. La respuesta publica muestra tipo, descripcion, medico, prioridad, estado, programacion, vencimiento, instrucciones y resultado cuando ya esta completado o revisado. No expone responsable interno, notas de revision, auditoria ni IDs de usuarios administrativos.
