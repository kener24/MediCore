# Flujo de hospitalizacion MediCore

## Conceptos

- Visita o admision ambulatoria: registro operativo de llegada del paciente para triaje, consulta o caja.
- Consulta medica: acto clinico del medico dentro del expediente.
- Hospitalizacion o internamiento: estancia clinica extendida ligada a clinica, paciente, usuario que registra, medico responsable opcional y cama opcional.
- Ronda de enfermeria: seguimiento periodico de pacientes internados.
- Nota de enfermeria: registro clinico de enfermeria durante internamiento. No se mezcla con notas de triaje.
- Administracion de medicamento: control de medicamentos programados, administrados, omitidos, retrasados o pendientes.

## Flujo base

1. Se crea un internamiento desde consulta, emergencia, recepcion, traslado u otro origen autorizado.
2. El sistema valida que el paciente no tenga otro internamiento activo en la misma clinica.
3. Si se asigna cama, la cama debe estar disponible y pasa a ocupada.
4. Cada asignacion de cama queda en historial.
5. Enfermeria registra signos vitales hospitalarios, notas y rondas de enfermeria.
6. Enfermeria programa medicamentos basicos y marca administrado, omitido o retrasado.
7. El medico o admin registra alta hospitalaria.
8. Al alta la cama queda en limpieza por defecto, o disponible si se indica.
9. Si se cancela el internamiento, la cama se libera como disponible.

## Estados

- active: paciente internado.
- observation: paciente en observacion.
- transferred: paciente trasladado o con cambio de cama.
- discharged: alta hospitalaria.
- cancelled: internamiento cancelado.

## Roles

- superadmin: no accede a datos clinicos de pacientes internados.
- admin clinica: gestiona habitaciones, camas e internamientos.
- medico: puede ver internamientos, signos y notas; puede dar alta.
- enfermeria: puede ver internamientos, registrar signos hospitalarios y notas.
- recepcion: puede crear internamientos y gestionar cama operativa, pero no crear notas clinicas.
- paciente: no accede a internamientos de otros pacientes.

## Entidades

- HospitalRoom
- HospitalBed
- Hospitalization
- HospitalBedAssignment
- HospitalVitalSigns
- NursingNote
- NursingRound
- MedicationAdministration
- HospitalizationEvent

## Endpoints

- GET/POST `/api/hospitalization/rooms/`
- GET/PATCH `/api/hospitalization/rooms/{id}/`
- GET/POST `/api/hospitalization/beds/`
- GET/PATCH `/api/hospitalization/beds/{id}/`
- GET `/api/hospitalization/beds/available/`
- GET/POST `/api/hospitalization/admissions/`
- GET/PATCH `/api/hospitalization/admissions/{id}/`
- POST `/api/hospitalization/admissions/{id}/assign-bed/`
- POST `/api/hospitalization/admissions/{id}/change-bed/`
- POST `/api/hospitalization/admissions/{id}/discharge/`
- POST `/api/hospitalization/admissions/{id}/cancel/`
- GET/POST `/api/hospitalization/admissions/{id}/vital-signs/`
- GET/POST `/api/hospitalization/admissions/{id}/nursing-notes/`
- GET/POST `/api/hospitalization/admissions/{id}/nursing-rounds/`
- GET/POST `/api/hospitalization/admissions/{id}/medication-administrations/`
- GET `/api/hospitalization/admissions/{id}/events/`
- GET `/api/hospitalization/dashboard/`
- GET `/api/hospitalization/medications/pending/`
- POST `/api/hospitalization/medication-administrations/{id}/administer/`
- POST `/api/hospitalization/medication-administrations/{id}/omit/`
- POST `/api/hospitalization/medication-administrations/{id}/delay/`

## Relacion con movil

Sprint 4.2 deja backend listo para que Sprint 4.3 construya hospitalizacion movil. La app movil no debe reutilizar pantallas de triaje inicial para controles de paciente internado.
