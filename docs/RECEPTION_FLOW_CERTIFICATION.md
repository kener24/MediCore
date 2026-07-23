# Certificación del flujo de recepción

Fecha local: 2026-07-21  
Sprint: 1.1

## Alcance

Se certificó el flujo existente de pacientes, citas, check-in y admisiones sin crear módulos paralelos. Las correcciones se concentraron en permisos, aislamiento por clínica, configuración de flujo, estados e idempotencia.

## Paciente sin cita

1. Recepción busca por nombre, identidad, teléfono o código.
2. Puede abrir un paciente existente o crear un registro mínimo si la clínica lo permite.
3. La interfaz y el backend advierten coincidencias por identidad, teléfono o nombre y fecha de nacimiento. Una identidad exacta no permite continuar con otro registro desde la app.
4. Si recepción confirma crear pese a una coincidencia probable, la decisión queda registrada en auditoría.
5. Se crea una visita sin cita únicamente para un paciente de la clínica autenticada.
6. Si el flujo requiere triaje, queda en `waiting_triage`; si va directo, exige médico de la misma clínica y queda en `waiting_doctor`.
7. Una segunda visita activa del paciente en el día es rechazada con un mensaje controlado.

## Paciente con cita

1. La agenda se filtra por la fecha seleccionada y muestra modalidad y visita asociada.
2. El check-in acepta citas pendientes, confirmadas o reprogramadas.
3. La cita se bloquea dentro de una transacción y se crea una sola visita.
4. Un reintento recupera la visita existente y responde `created: false`.
5. La cita queda confirmada, conserva su historial y expone `visit_id` para abrir la visita.
6. La configuración de citas en línea se valida al crear o reprogramar; no bloquea el check-in de una cita presencial existente.

## Configuración aplicada

- `allow_walk_in_patients`
- `allow_appointments`
- `allow_online_appointments`
- `allow_in_person_appointments`
- `reception_can_create_minimal_patient`
- `walk_in_requires_triage`
- `appointment_requires_triage`
- `appointment_direct_to_doctor`
- `require_identity_for_patient`
- `require_phone_for_patient`

Las configuraciones contradictorias de citas se rechazan en el modelo. Recepción puede consultar la configuración de su propia clínica, pero no modificarla.

## Permisos certificados

Recepción y administración de clínica pueden ejecutar las acciones operativas permitidas. Enfermería, médico y paciente no pueden crear check-in ni visitas sin cita por estos endpoints. El superadministrador no obtiene acceso clínico implícito. El backend aplica estas reglas aunque un cliente manipule la interfaz.

## Correcciones principales

- Se centralizaron los endpoints existentes en los servicios de dominio ya presentes.
- Se bloquearon cambios clínicos directos mediante el `PATCH` genérico de visitas.
- Se eliminó el fallback móvil que intentaba alterar estados por ese `PATCH`.
- Se normalizó la respuesta de ambos endpoints de check-in.
- Se agregó unicidad de visita por cita en base de datos.
- Se evitó omitir triaje obligatorio y se exigió médico para flujo directo.
- Se limitaron cancelaciones a estados operativos de recepción.
- Web y móvil ocultan o bloquean acciones deshabilitadas por la clínica.

## Resultado local

- Django: 264/264 pruebas aprobadas.
- `manage.py check`: sin errores.
- Migraciones: sin cambios adicionales pendientes.
- Web: lint sin errores y build de producción aprobado.
- Móvil: TypeScript aprobado, lint aprobado y Expo Doctor 18/18.

La prueba en Android físico no se considera aprobada hasta ser ejecutada por una persona en el dispositivo.
