# Pruebas multi-clinica y multi-paciente

La bateria automatizada crea dos clinicas y tres pacientes independientes. Verifica que el paciente autenticado no pueda consultar, cancelar, reprogramar o descargar recursos pertenecientes a otro paciente o clinica.

Casos cubiertos:

- Perfil resuelto por sesion e intento de enviar `patient_id` o `clinic` ignorado.
- Medico de otra clinica rechazado al solicitar cita.
- Cita ajena no visible ni cancelable.
- Reprogramacion idempotente sobre el mismo registro.
- Consulta en borrador oculta.
- Receta en borrador y receta ajena ocultas.
- Orden no autorizada o ajena oculta.
- Documento propio descargable; documento oculto o ajeno devuelve 404.
- Configuracion publica sin SMTP, secretos ni datos fiscales.

Los intentos bloqueados relevantes generan auditoria sin copiar contenido clinico completo.
