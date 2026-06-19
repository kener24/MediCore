# Permisos de hospitalizacion

## Datos clinicos

- Superadmin: no ve datos clinicos de internamientos.
- Paciente: no ve rondas internas ni administracion de medicamentos.
- Recepcion/caja: no ve rondas ni administra medicamentos.
- Recepcion: puede crear internamientos y gestionar camas si pertenece a la clinica, pero no ve signos, notas, rondas, eventos clinicos ni medicamentos.
- Admin clinica: puede ver datos de su clinica.
- Medico: puede ver internamientos, rondas y medicamentos de su clinica.
- Enfermeria: puede ver internamientos, crear rondas y administrar medicamentos.

## Acciones criticas

- Crear ronda: solo enfermeria.
- Programar medicamento simple: enfermeria.
- Administrar medicamento: enfermeria.
- Omitir medicamento: enfermeria y requiere motivo.
- Retrasar medicamento: enfermeria.
- Hospitalizacion cerrada: no permite rondas ni acciones de medicamentos.
- Alta hospitalaria: admin y medico; requiere motivo y libera la cama.
- Crear/editar habitaciones y camas: admin y recepcion.

## Auditoria

Se audita creacion/edicion de habitaciones y camas, creacion de internamiento, asignacion/cambio/liberacion de cama, alta, cancelacion, signos, notas, rondas, programacion de medicamento, administracion, omision y retraso.
