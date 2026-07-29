# Plan de tratamiento hospitalario

Cada internamiento puede tener un plan principal activo. El médico registra objetivos, tratamiento, dieta, actividad, monitoreo y precauciones según corresponda.

Una actualización no sobrescribe el plan anterior:

1. Se bloquea el internamiento.
2. Se exige motivo si ya existe plan activo.
3. El plan anterior pasa a `replaced`.
4. Se crea la siguiente versión como `active`.
5. Se registra auditoría.

Enfermería recibe únicamente el plan vigente dentro del detalle hospitalario. El historial completo permanece disponible para médico y administración autorizada.

Endpoint: `GET/POST /api/hospitalization/admissions/{id}/treatment-plans/`.
