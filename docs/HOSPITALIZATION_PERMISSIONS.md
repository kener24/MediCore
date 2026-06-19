# Permisos de hospitalizacion

## Datos clinicos

- Superadmin: no ve datos clinicos de internamientos.
- Paciente: no ve rondas internas ni administracion de medicamentos.
- Recepcion/caja: no ve rondas ni administra medicamentos.
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

## Auditoria

Se audita creacion de rondas, programacion de medicamento, administracion, omision y retraso.
