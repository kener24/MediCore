# Pruebas multi-clínica de enfermería

## Matriz certificada

| Caso | Resultado esperado |
| --- | --- |
| Enfermería A lista cola | Solo visitas A |
| Enfermería A abre visita B | 404 |
| Enfermería A inicia visita B | 404 |
| Enfermería A guarda signos en B | 404 |
| Enfermería A completa visita B | 404 |
| Médico A consulta sala | Solo visitas A asignadas o generales |
| Recepción consulta triaje | 403 |
| Médico modifica signos de triaje | 403 |
| Recepción consulta visita | Alergias, antecedentes y signos ocultos |
| Enfermería consulta visita propia | Datos críticos autorizados visibles |

## Protección aplicada

- El ViewSet filtra por `request.user.clinica_id`.
- Superadmin no obtiene detalle clínico por este ViewSet.
- Las acciones usan `get_object()` sobre el queryset filtrado.
- Los servicios vuelven a validar clínica después de bloquear la fila.
- Los campos clínicos críticos requieren rol admin, enfermería o médico y contexto autenticado.
- Los identificadores manipulados no revelan si el recurso existe en otra clínica.

## Regresión automatizada

Las pruebas crean dos clínicas, enfermeras independientes y visitas propias. Se comprueban lista, detalle, inicio, signos, finalización, datos críticos y sala médica. Los datos se crean en una base temporal y no modifican registros de desarrollo o producción.
