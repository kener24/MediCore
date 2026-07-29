# Evolución médica hospitalaria

El médico crea una evolución en borrador desde el internamiento. Los borradores solo son visibles al autor y roles autorizados; no aparecen como entradas definitivas de la línea de tiempo.

Al firmar:

- se conserva autor y fecha;
- el contenido deja de ser editable;
- se agrega una entrada clínica;
- se registra auditoría.

Una corrección no sobrescribe la evolución firmada. Se crea una evolución de tipo `correction`, enlazada con `correction_of` y con motivo obligatorio.

Endpoints:

- `GET/POST /api/hospitalization/admissions/{id}/evolutions/`
- `POST /api/hospitalization/evolutions/{id}/sign/`
- `POST /api/hospitalization/evolutions/{id}/correct/`
