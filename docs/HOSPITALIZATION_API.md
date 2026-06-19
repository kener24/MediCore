# API de hospitalizacion

La API de hospitalizacion esta bajo `/api/hospitalization/` y siempre respeta la clinica del usuario autenticado.

## Seguridad

- Usa JWT Bearer.
- Superadmin no recibe datos clinicos de hospitalizacion.
- Paciente no ve datos de otros pacientes.
- Enfermeria puede registrar signos y notas.
- Recepcion no puede crear notas clinicas.
- Cama, paciente, medico, visita y consulta deben pertenecer a la misma clinica.

## Modelos

- `HospitalRoom`: habitacion o sala.
- `HospitalBed`: cama hospitalaria con estado operativo.
- `Hospitalization`: internamiento del paciente.
- `HospitalBedAssignment`: historial de camas.
- `HospitalVitalSigns`: signos vitales hospitalarios, separados de triaje.
- `NursingNote`: nota de enfermeria de internamiento.
- `NursingRound`: ronda/revision de enfermeria.
- `MedicationAdministration`: programacion y estado de administracion de medicamentos.
- `HospitalizationEvent`: bitacora clinica-operativa del internamiento.

## Errores frecuentes

- Cama ocupada: no se puede crear o cambiar internamiento a cama ocupada.
- Paciente con internamiento activo: no se permite duplicar.
- Clinica cruzada: no se aceptan recursos de otra clinica.
- Internamiento cerrado: no permite signos ni notas.
- Ronda en internamiento cerrado: no se permite crear.
- Medicamento omitido sin motivo: se rechaza.
- Medicamento administrado dos veces: se rechaza.

## Reportes base

`GET /api/hospitalization/dashboard/` devuelve conteos de pacientes activos, camas disponibles, camas ocupadas, camas en limpieza, altas del dia y notas urgentes.

## Rondas y medicamentos

- `GET /api/hospitalization/admissions/{id}/nursing-rounds/`
- `POST /api/hospitalization/admissions/{id}/nursing-rounds/`
- `GET /api/hospitalization/admissions/{id}/medication-administrations/`
- `POST /api/hospitalization/admissions/{id}/medication-administrations/`
- `GET /api/hospitalization/medications/pending/`
- `POST /api/hospitalization/medication-administrations/{id}/administer/`
- `POST /api/hospitalization/medication-administrations/{id}/omit/`
- `POST /api/hospitalization/medication-administrations/{id}/delay/`
