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

## Evidencia de produccion

El 2026-07-30 se repitio la validacion mediante HTTPS con tres pacientes de tres clinicas distintas. Cada cuenta consulto contenido propio no vacio y se probaron accesos cruzados ciclicos sobre recetas, ordenes, documentos y archivos descargables. Los doce accesos ajenos devolvieron 404 y los accesos propios respondieron 200.

Los usuarios usados fueron cuentas demo controladas. Todas sus sesiones tecnicas quedaron revocadas al finalizar.

## Ampliación Sprint 1.7B

El 2026-07-31 se amplió la matriz HTTPS a facturas, pagos, recibos, notas de crédito, notificaciones y sesiones. Se usaron dos pacientes de una clínica y un paciente de otra clínica.

- Los listados propios respondieron 200 y conservaron datos independientes.
- PDFs de factura, recibo y nota propios respondieron 200 con `application/pdf` cuando existía el recurso demo.
- Los intentos cruzados disponibles devolvieron 404 sin metadatos del recurso.
- Una notificación ajena no pudo marcarse como leída.
- Una sesión ajena no pudo revocarse.
- Un token push activo no pudo registrarse para otro paciente y devolvió 409.
- El dispositivo de prueba quedó revocado y las sesiones creadas para la certificación se cerraron.

B1 no tenía pagos ni notas de crédito, y A2 no tenía notas de crédito. Esos cruces quedaron identificados como casos sin datos; el control equivalente se validó entre A1 y A2 y mediante pruebas automatizadas.
