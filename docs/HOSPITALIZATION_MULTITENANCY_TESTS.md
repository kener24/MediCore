# Pruebas multi-clínica de hospitalización

## Regla de aislamiento

Los ViewSets filtran por la clínica del usuario autenticado. Los servicios vuelven a validar la clínica en internamientos, médicos, pacientes, productos, lotes, consumos y facturas. El superadministrador no recibe contenido clínico detallado.

## Cobertura automatizada

- Enfermería de Clínica B no puede administrar una dosis de Clínica A.
- Un producto o lote de otra clínica no puede consumirse.
- La factura siempre conserva clínica y paciente del internamiento.
- Un paciente solo obtiene sus propios resúmenes firmados.
- Los identificadores manipulados se resuelven como recurso inexistente o acceso prohibido.
- La cola de medicamentos se construye exclusivamente para la clínica de la sesión.

Las pruebas usan dos clínicas y datos ficticios. No contienen información clínica real.
