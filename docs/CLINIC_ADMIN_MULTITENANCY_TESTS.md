# Pruebas multi-clinica del administrador

La clase `ClinicAdminCertificationTests` crea Clinica A, Clinica B, administradores, personal, medicos y sesiones independientes.

Se verifica que Admin A no pueda listar, abrir, restablecer contrasena, revocar sesiones ni administrar horarios de B. Tambien se verifica exclusion de superadmin, busqueda minima, correo duplicado, rol prohibido, ultimo administrador, revocacion al cambiar rol, IP enmascarada, metricas, alertas y estado operativo.

Los intentos cruzados devuelven 404 y dejan auditoria de permiso denegado. Las pruebas no contienen credenciales, identidades ni datos clinicos reales.
