# Certificación de hospitalización - Sprint 1.6A

## Alcance certificado

Se reutilizó la aplicación `apps.hospitalization`. No se duplicaron internamientos, habitaciones, camas, signos, notas, rondas ni eventos existentes. Se agregaron únicamente las piezas ausentes: evolución médica hospitalaria, plan de tratamiento versionado e indicaciones hospitalarias.

El flujo certificado es: ingreso pendiente, asignación de cama, internamiento activo, plan vigente, indicaciones, confirmación de enfermería, signos, notas por turno, rondas, evoluciones y eventos.

## Garantías

- La clínica se deriva del usuario autenticado.
- Un paciente no puede tener dos internamientos abiertos compatibles.
- Una cama solo puede tener una asignación activa.
- La ocupación se resuelve desde la asignación activa y se refleja en la cama y el internamiento.
- Los cambios de cama son atómicos y conservan historial.
- Evoluciones firmadas y notas registradas son inmutables; la corrección crea una entrada trazable.
- Solo existe un plan activo; las versiones anteriores quedan reemplazadas.
- Leer una indicación no equivale a completarla.
- Recepción no recibe notas, evoluciones, alergias ni antecedentes profundos.
- Paciente y superadmin no acceden al módulo clínico interno.

## Verificación local

- `python manage.py check`: correcto, con aviso no bloqueante del correo local.
- `python manage.py test apps.hospitalization`: 20 pruebas correctas; una prueba MySQL de concurrencia se omite en SQLite.
- `python manage.py audit_hospital_bed_consistency --json`: consistente.
- Build web, TypeScript móvil y lint Expo: correctos.
- Producción MySQL: 20/20 pruebas correctas, incluida concurrencia.
- Pruebas HTTPS por rol: médico, enfermería y recepción autorizados; paciente y superadmin bloqueados.
- Regresión global: 340 pruebas correctas, 3 omitidas y 0 fallos.

## Fuera de alcance

La administración profunda de medicamentos, descuento de inventario, alta definitiva, receta de alta, facturación integral, portal del paciente y push quedan para Sprint 1.6B.
