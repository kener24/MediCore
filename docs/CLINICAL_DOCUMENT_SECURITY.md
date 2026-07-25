# Seguridad de documentos clínicos

## Alcance

Se reutiliza `ClinicalDocument` para adjuntos de paciente, expediente, consulta, cita y orden médica. Web y móvil pueden listar, cargar, abrir y cambiar visibilidad desde una consulta autorizada.

## Validaciones de archivo

- Límite de tamaño configurado por backend y comprobación previa de 10 MB en las interfaces.
- Lista permitida: PDF, JPEG, PNG, WebP, DOC, DOCX, XLS y XLSX.
- Bloqueo explícito de ejecutables y scripts.
- Nombre almacenado reducido a su nombre base, sin rutas enviadas por el cliente.
- Verificación de firma binaria para imágenes, PDF y formatos antiguos de Office.
- Inspección de estructura ZIP para DOCX y XLSX.
- MIME guardado a partir del contenido detectado, no del encabezado del cliente.

Una extensión permitida con contenido falso es rechazada.

## Acceso y visibilidad

Las rutas anidadas validan rol y clínica antes de listar o cargar; un ID de otra clínica devuelve 404. Descarga y vista previa vuelven a comprobar documento, estado, rol y clínica. El paciente usa endpoints exclusivos del portal y solo recibe documentos propios, activos y marcados como visibles.

Superadmin no puede abrir contenido clínico. Recepción solo accede a tipos administrativos no sensibles. Los cambios de visibilidad y cargas se auditan sin copiar el archivo al registro de auditoría.

## Endpoints principales

- `GET|POST /api/consultations/{id}/documents/`
- `GET|POST /api/medical-orders/{id}/documents/`
- `GET /api/documents/{id}/preview/`
- `GET /api/documents/{id}/download/`
- `PATCH /api/documents/{id}/mark-visible-to-patient/`
- `PATCH /api/documents/{id}/mark-hidden-from-patient/`
- `GET /api/patient-portal/documents/{id}/preview/`
- `GET /api/patient-portal/documents/{id}/download/`

## Riesgo crítico pendiente

La plataforma valida formato y permisos, pero todavía no integra antivirus o sandbox antimalware. No se considera que un archivo esté libre de malware. Antes de una adopción clínica de mayor escala se recomienda integrar un motor como ClamAV, cuarentena previa y monitoreo de almacenamiento.
