# Contexto clínico integrado del paciente

## Objetivo

El médico consulta la información relevante sin abandonar la consulta activa. La respuesta se obtiene desde `/api/consultations/{id}/clinical-context/`, por lo que la autorización parte de una consulta real y no de un identificador arbitrario de paciente.

## Información incluida

- Identificación y contacto disponibles del paciente.
- Motivo, prioridad, evaluación y observaciones del triaje actual.
- Signos vitales del triaje.
- Alergias.
- Enfermedades crónicas.
- Medicamentos crónicos.
- Antecedentes quirúrgicos, familiares y generales.
- Diagnósticos recientes.
- Cinco registros recientes de signos vitales.
- Tres consultas finalizadas recientes.

## Seguridad

- Requiere autenticación.
- Solo el médico propietario de la consulta puede obtener el contexto.
- El queryset filtra por clínica y rol.
- Un ID de otra clínica devuelve 404 sin revelar la existencia del recurso.
- Caja, recepción, enfermería, paciente y superadmin no reciben este contexto por este endpoint.
- La consulta del contexto queda auditada sin copiar texto clínico completo al log.

## Presentación

Web utiliza tarjetas compactas y secciones plegables. Móvil reutiliza los componentes de riesgo, resumen clínico y línea de tiempo existentes. Las alergias permanecen visibles como alerta clínica y el detalle histórico no reemplaza el formulario activo.

