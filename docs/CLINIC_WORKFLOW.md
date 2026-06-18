# Flujo clínico base de MediCore

MediCore es un SaaS multi-clínica. Cada dato clínico pertenece a una clínica y debe filtrarse por rol, clínica y relación operativa con el paciente.

## Entidades base

| Entidad | Propósito | Reglas principales |
| --- | --- | --- |
| Paciente | Persona registrada en una clínica. | Puede existir sin cita, sin visita del día y con múltiples citas, visitas, consultas, facturas y pagos. |
| Cita | Reserva de agenda. | No es visita ni consulta. Cuando el paciente llega, se hace check-in y se crea una visita. |
| Visita / admisión | Atención operativa del día. | Es el eje que conecta recepción, triaje, médico y caja. Puede venir de cita o ser sin cita. |
| Triaje | Evaluación inicial de enfermería. | Registra signos vitales, motivo inicial y prioridad. |
| Signos vitales | Datos clínicos medidos. | Pertenecen a visita o consulta. Deben mantenerse dentro de rangos razonables. |
| Consulta médica | Acto clínico del médico. | Pertenece a una visita, paciente, expediente y médico. Puede producir diagnósticos, recetas, órdenes y consumos. |
| Factura | Documento de cobro. | Puede vincularse a visita/consulta. Tiene estados financiero/fiscal separados. |
| Pago | Abono aplicado a factura. | No existe sin factura y no debe exceder saldo pendiente. |
| Caja | Sesión financiera diaria. | Agrupa pagos y movimientos de caja. |
| Clínica | Tenant principal. | Todo dato sensible debe pertenecer y filtrarse por clínica. |
| Usuario / rol / permiso | Acceso al sistema. | El rol define visibilidad; permisos futuros pueden afinar acciones por clínica. |

## Flujo sin cita

1. Recepción busca paciente por identidad, teléfono o nombre.
2. Si existe, lo selecciona.
3. Si no existe y la clínica lo permite, crea perfil básico.
4. Recepción crea visita `walk_in` del día.
5. La visita pasa a `waiting_triage` o `waiting_doctor` según configuración.
6. Enfermería realiza triaje si aplica.
7. Médico inicia y finaliza consulta.
8. Si la clínica factura después, la visita pasa a caja.
9. Caja genera factura/pago.
10. La visita queda `completed`.

## Flujo con cita

1. Recepción localiza cita confirmada/pendiente.
2. Hace check-in.
3. El sistema crea una visita ligada a esa cita.
4. La cita no se convierte en consulta; solo queda relacionada.
5. La visita sigue triaje o pasa directo a médico según configuración.
6. Médico atiende y finaliza consulta.
7. Caja cobra si corresponde.
8. Visita completada.

## Reglas críticas

- Paciente sin cita no requiere `appointment_id`.
- Una cita no puede generar dos visitas activas.
- Una cita cancelada no admite check-in.
- Una visita activa no debe duplicarse para el mismo paciente en el mismo día.
- Recepción no ve notas médicas completas.
- Superadmin no ve pacientes, consultas, expedientes, recetas ni facturas detalladas.
- Paciente solo ve su propia información.

## Endpoints principales

| Rol | Endpoint | Uso |
| --- | --- | --- |
| Recepción | `POST /api/reception/visits/walk-in/` | Registrar paciente sin cita. |
| Recepción | `POST /api/reception/appointments/{id}/check-in/` | Check-in de cita. |
| Enfermería | `GET /api/nursing/triage-queue/` | Cola de triaje. |
| Médico | `GET /api/doctor/waiting-room/` | Sala médica. |
| Caja | `GET /api/cashier/pending-billing/` | Visitas pendientes de cobro. |
| Admin clínica | `GET/PATCH /api/clinic/workflow-settings/` | Configurar flujo clínico. |
