# Auditoría de arquitectura de seguridad

Fecha: 2026-08-03. Alcance: Sprint 1.9A.

| Control | Estado inicial | Riesgo | Acción del sprint | Estado |
| --- | --- | --- | --- | --- |
| Login | Parcial | Mensajes distinguían clínica/bloqueo | Respuesta genérica, email normalizado, auditoría | Implementado |
| Fuerza bruta | Parcial | Solo bloqueo de usuarios existentes | Throttle por IP e identificador más bloqueo temporal | Implementado |
| Access JWT | Parcial | No ligado al dispositivo/sesión | Claim `sid` validado contra `X-Session-Key` | Implementado |
| Refresh JWT | Parcial | Sin rotación/blacklist | Rotación, blacklist y hash rotado por sesión | Implementado |
| Logout | Parcial | Revocaba sesión, no blacklist explícita | Revoca sesión, dispositivo y refresh presentado | Implementado |
| Cambio de contraseña | Implementado | Sesiones paralelas | Revoca todas salvo la actual; recuperación revoca todas | Implementado |
| Sesiones activas | Implementado | Exposición de secretos | No expone claves, tokens, IP ni user-agent completos al usuario | Implementado |
| RBAC/objeto | Parcial | Respuestas clínicas demasiado permisivas | Rechazo explícito y querysets por clínica/propietario | Reforzado |
| Multi-tenancy | Implementado | Relaciones cruzadas en payload | Pruebas A/B y validación de relaciones | Certificado |
| Superadmin | Implementado | 200 vacío en algunos dominios clínicos | 403/404 explícito en datos identificables | Certificado |
| AuditLog | Parcial | `QuerySet.update/delete` podía eludir modelo | Manager append-only, request ID y redacción | Implementado |
| Archivos | Parcial | Nginx publicaba `/media/` | Descarga autenticada y `/media/` devuelve 404 | Implementado |
| Errores | Parcial | Sin correlación uniforme | Mensaje 500 genérico y `X-Request-ID` | Implementado |
| CORS/CSRF | Implementado | Mezcla de entornos | Orígenes por variables; JWT usa Authorization, no cookie auth | Certificado |
| Headers/HTTPS | Parcial | Headers no centralizados | Nginx y Django endurecidos; HSTS solo producción HTTPS | Implementado |
| Secretos | Parcial | Settings legado tenía clave de desarrollo | Retirado valor versionado; `.env` ignorado | Corregido |
| Web | Parcial | Tokens en Web Storage | Limpieza total, CSP y sin render HTML inseguro | Reforzado; riesgo residual documentado |
| Móvil | Implementado | Cachés de rol sobrevivían logout | Limpieza de cache API, enfermería, borradores, favoritos y archivos | Reforzado |
| Dependencias | Parcial | Avisos transitivos | Clasificados sin upgrades mayores incompatibles | Riesgo controlado |

## Arquitectura vigente

- Django REST Framework es la autoridad final; React y Expo solo ocultan acciones por ergonomía.
- JWT se envía en `Authorization: Bearer`; no se usan cookies JWT. CSRF se mantiene para Django Admin/sesiones web.
- Cada petición autenticada exige un access token con `sid` y el mismo `X-Session-Key` activo.
- `UserSession` guarda solo hash del refresh, fechas, estado y metadatos de dispositivo; nunca el token completo.
- Los recursos clínicos y financieros se filtran por clínica, propietario y rol antes de resolver el ID.
- `AuditLog` es append-only en API, instancia y queryset. La eliminación por retención queda deshabilitada.
- Los documentos clínicos se sirven únicamente mediante endpoints autenticados.

## Riesgos pendientes aceptados

- Web Storage sigue siendo un riesgo residual ante XSS. Migrar refresh a cookie HttpOnly requiere un cambio arquitectónico posterior.
- No existe antivirus/antimalware; se valida tamaño, extensión, firma real y autorización.
- La protección append-only ante un administrador directo de MySQL requiere controles de infraestructura/privilegios y respaldo WORM.
- Validación en Android físico y pruebas de carga pertenecen a pasos manuales/Sprint 1.9B.
