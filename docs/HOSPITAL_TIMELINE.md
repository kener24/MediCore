# Línea de tiempo hospitalaria

`GET /api/hospitalization/admissions/{id}/timeline/` agrega cronológicamente eventos hospitalarios, evoluciones firmadas/correcciones y signos vitales hospitalarios.

La respuesta está limitada entre 1 y 100 entradas; un límite inválido produce `400` controlado. Los borradores médicos no aparecen en la línea de tiempo.

Cada entrada contiene tipo, título, descripción resumida, severidad, fecha y usuario. No se copian textos clínicos completos a auditoría y la línea de tiempo respeta el alcance de clínica y rol.

La web y las apps de médico/enfermería consumen este endpoint real. Las extensiones de medicamentos y alta se incorporarán en Sprint 1.6B.
