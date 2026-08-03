# Seguridad multi-clínica

## Regla

Todo objeto clínico, operativo o financiero debe resolverse desde la clínica del usuario autenticado. `clinic`/`clinica`, propietarios, totales, saldos, stock, actores y estados críticos son autoridad del backend.

## Controles

- Querysets filtran clínica antes de `get_object` y devuelven 404 cuando el ID pertenece a otro tenant.
- Serializers validan paciente, médico, cita, consulta, cama, producto, lote, factura, caja y documento relacionados.
- Paciente solo accede a recursos asociados a su usuario.
- Médico modifica únicamente consultas propias; enfermería opera el tenant asignado.
- Superadmin administra SaaS y queda fuera de expedientes, consultas y documentos privados.
- Exportaciones, PDFs, búsquedas, reportes y descargas reutilizan querysets acotados.

## Evidencia

`tests/security/test_multitenancy.py`, `test_idor_protection.py`, `test_superadmin_restrictions.py` y suites de billing, inventario, hospitalización, documentos, recepción y portal crean clínicas A/B y manipulan IDs/relaciones.
