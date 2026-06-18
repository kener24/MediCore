# Matriz de roles y permisos

## Superadmin SaaS

Puede administrar plataforma, clínicas, planes, suscripciones, métricas agregadas y auditoría técnica.

No puede ver datos clínicos internos: pacientes, citas clínicas detalladas, expedientes, consultas, diagnósticos, recetas, órdenes, documentos clínicos, facturas detalladas ni pagos individuales.

## Admin clínica

Puede administrar su clínica, usuarios, flujo clínico, pacientes, citas, admisiones, facturación, caja, inventario, reportes y auditoría de su clínica.

La visibilidad clínica sensible puede refinarse luego con permisos granulares por clínica.

## Recepción

Puede buscar/crear paciente básico, crear visitas, hacer check-in, agendar citas y ver sala administrativa.

No puede ver notas médicas completas, diagnósticos detallados, editar consultas, crear recetas ni órdenes médicas.

## Caja

Puede ver facturas, pagos, caja, recibos y cierres.

No puede editar consultas ni ver notas clínicas completas.

## Enfermería

Puede ver cola de triaje, datos básicos del paciente, registrar signos vitales, evaluación inicial y prioridad.

No puede ver caja completa, crear facturas, modificar diagnósticos médicos ni editar consultas.

## Médico

Puede ver sus citas, pacientes asignados, triaje, signos vitales, consultas, diagnósticos, recetas, órdenes y consumos de sus atenciones.

No puede ver caja completa, administrar usuarios ni ver pacientes de otros médicos salvo configuración futura.

## Paciente

Puede ver sus citas, recetas, facturas, perfil e historial permitido.

No puede ver información de otros pacientes ni datos internos.

## Bloqueos backend aplicados

| Recurso | Superadmin | Recepción | Enfermería | Médico | Paciente |
| --- | --- | --- | --- | --- | --- |
| Pacientes | Bloqueado | Básico | Básico | Asignados/permitidos | Propio |
| Expediente completo | Bloqueado | Bloqueado | Permitido | Permitido | Resumen permitido |
| Consultas | Bloqueado | Bloqueado | Clínica | Propias | Finalizadas propias |
| Recetas/diagnósticos | Bloqueado | Bloqueado | Clínica | Propias | Propias emitidas |
| Facturas detalladas | Bloqueado | Permitido si caja/recepción | Bloqueado | Bloqueado | Propias |
| Documentos clínicos | Bloqueado | Solo no sensibles admin | Permitido | Permitido | Propios visibles |
