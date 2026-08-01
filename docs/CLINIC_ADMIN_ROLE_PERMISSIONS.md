# Roles y permisos del administrador de clinica

El modulo movil se habilita solo para el rol real `admin`, con usuario activo, clinica vinculada y clinica activa.

## Roles gestionables

- `medico`
- `enfermera`
- `recepcionista`
- `recepcionista_caja`
- `cajero` cuando exista en el catalogo de la clinica
- `paciente` para gestion basica ya existente
- `admin` solo dentro de las protecciones administrativas existentes

Nunca se muestra ni se acepta `superadmin`. Los intentos de rol prohibido, recurso fuera de clinica o superadministrador devuelven 400/403/404 sin metadatos y quedan auditados. Cambiar rol revoca las sesiones activas y mantiene coherencia con el perfil medico existente.
