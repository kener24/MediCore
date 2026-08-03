# Hardening web

- Guards por sesión/rol; un 401 intenta un solo refresh rotativo y luego desmonta la sesión.
- Logout envía refresh al backend y limpia todas las claves privadas `medicore.*` de local/session storage.
- No existe `dangerouslySetInnerHTML`; React escapa texto de pacientes por defecto.
- No se aceptan redirects externos arbitrarios.
- CSP, frame protection, nosniff, referrer y permissions policy se sirven desde Nginx.
- CORS usa allowlist por entorno; producción no habilita todos los orígenes.

Riesgo residual: access/refresh permanecen en `localStorage`. CSP, ausencia de HTML arbitrario y validación reducen XSS, pero cookie HttpOnly sería una evolución arquitectónica futura.
