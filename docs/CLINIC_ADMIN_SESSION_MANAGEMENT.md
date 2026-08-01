# Gestion de sesiones administrativas

El administrador consulta solo sesiones activas de usuarios de su clinica mediante `/api/security/admin/sessions/`.

La respuesta muestra usuario, rol, dispositivo, plataforma, ubicacion enmascarada, actividad, vencimiento y sesion actual. No expone IP completa ni `user-agent`.

La revocacion individual y total exige motivo, verifica alcance, invalida la sesion y registra auditoria. Desactivar usuario revoca todas sus sesiones. Reactivar obliga un nuevo login. Una sesion ajena o de superadministrador responde 404 sin revelar existencia.
