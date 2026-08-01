# Seguridad de configuracion de clinica

La aplicacion movil permite editar datos administrativos basicos de la clinica autenticada y consultar estado operativo, fiscal y rangos. No permite cambiar ID, estado global, plan SaaS, datos de otra clinica ni configuraciones fiscales sensibles.

Las mutaciones exigen conexion; no se encolan cambios administrativos offline. Las lecturas pueden usar cache aislada por usuario, clinica y sesion. Logout elimina cache, datos temporales y credenciales.

Los ajustes avanzados de flujo y fiscal permanecen en web para reducir cambios accidentales. Cada modificacion permitida registra valores anteriores y posteriores en auditoria.
