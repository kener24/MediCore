# Medicos y horarios del administrador de clinica

Se reutilizan `DoctorProfile`, `DoctorSchedule` y `/api/doctors/`.

El administrador puede consultar y editar especialidad, colegiacion, titulo, tarifa, duracion y modalidades en los formularios existentes. Desde el detalle movil puede listar, crear, editar y desactivar horarios semanales.

El backend valida que el medico pertenezca a la clinica, que la hora final sea posterior, que no existan traslapes y que no se duplique el horario. Desactivar o editar un horario no cancela citas existentes; la interfaz muestra esta advertencia. Cada alta, cambio y desactivacion queda auditada.

No existe un modelo de bloqueos de agenda en el esquema actual. Se documenta como pendiente de Sprint 1.8B para no inventar una implementacion parcial ni cancelar citas silenciosamente.
