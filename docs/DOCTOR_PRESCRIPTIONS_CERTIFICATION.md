# Certificación de recetas médicas

## Alcance

El Sprint 1.3B reutiliza `Prescription` y `PrescriptionItem`; no crea un segundo módulo de recetas. La receta queda vinculada a clínica, paciente, médico y consulta. La clínica no se acepta libremente desde el cliente: se deriva de la consulta autorizada.

## Flujo certificado

1. El médico crea una receta en borrador desde una consulta activa.
2. Agrega medicamentos con nombre, presentación, dosis, frecuencia, duración, cantidad, vía e instrucciones.
3. El backend busca coincidencias con las alergias registradas del paciente.
4. Si existe advertencia, la emisión exige confirmación y justificación clínica.
5. La emisión guarda usuario, fecha y revisión de alergias.
6. Una receta emitida queda inmutable y solo puede anularse con motivo.
7. El PDF se habilita únicamente para recetas emitidas y usuarios autorizados.

## Estados y tipos

- Estados internos: `borrador`, `emitida`, `anulada`.
- Tipos: `unica`, `repetible`.
- La receta repetible valida máximo de dispensaciones, intervalo y vencimiento cuando se informan.
- El historial operativo de dispensaciones requiere el futuro módulo de farmacia y queda pendiente para Sprint 1.4.

## Endpoints

- `GET|POST /api/consultations/{id}/prescriptions/`
- `GET|POST /api/prescriptions/`
- `GET|PATCH /api/prescriptions/{id}/`
- `GET|POST /api/prescriptions/{id}/items/`
- `PATCH|DELETE /api/prescriptions/{id}/items/{item_id}/`
- `PATCH /api/prescriptions/{id}/issue/`
- `PATCH /api/prescriptions/{id}/void/`
- `GET /api/prescriptions/{id}/pdf/`
- `GET /api/patient-portal/prescriptions/{id}/pdf/`

`DELETE` de recetas está bloqueado. La doble emisión devuelve conflicto y no repite auditoría ni notificación.

## Permisos y auditoría

Solo el médico propietario puede crear, emitir o anular la receta. El paciente usa el endpoint seguro del portal y solo ve recetas emitidas propias. Superadmin no recibe contenido clínico. Se auditan creación, advertencia de alergia, confirmación, emisión, anulación y consulta de PDF sin guardar texto clínico completo.

## Dosificación por peso

El catálogo actual no contiene dosis por kilogramo, unidad por kilogramo, límites de peso ni dosis máxima farmacológica. Por seguridad no se creó un cálculo aparente ni una recomendación automática. Esta capacidad requiere un catálogo farmacológico validado y queda fuera del sprint.
