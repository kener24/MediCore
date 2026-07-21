# Evidencia de pruebas en producción

Fecha: 2026-07-21

Resultados ejecutados contra `https://kp-software.tech`. Este documento no contiene contraseñas, tokens, identificaciones ni datos clínicos sensibles.

| ID | Prueba | Resultado | Evidencia segura |
| --- | --- | --- | --- |
| PROD-01 | Respaldo/estado previo del servidor | Aprobado | Backup MySQL verificado y copia del estado previo en `/var/www/medicore/backups/sprint10-20260721-180946` |
| PROD-02 | `git pull` y versión desplegada | Aprobado | Commit funcional desplegado: `34eebe1` |
| PROD-03 | Migraciones y `manage.py check` | Aprobado | Migraciones aplicadas; `manage.py check` sin errores |
| PROD-04 | Build web de producción | Aprobado | Vite compiló; assets `index-C0mCxDpb.js` e `index-B922Lycc.css` |
| PROD-05 | Reinicio Gunicorn y estado activo | Aprobado | `medicore.service=active` |
| PROD-06 | `nginx -t` y recarga | Aprobado | Configuración válida; `nginx=active` |
| PROD-07 | HTTPS y pantalla de login | Aprobado | `https://kp-software.tech/login` respondió 200 y cargó en navegador |
| PROD-08 | Login de Clínica A | Aprobado | Sesión admin asociada a Clínica A; 12 pacientes visibles |
| PROD-09 | Login de Clínica B | Aprobado | Sesión admin asociada a Clínica B; 12 pacientes visibles |
| PROD-10 | Recurso propio visible | Aprobado | Listados propios respondieron 200 bajo sesión válida |
| PROD-11 | Recurso de otra clínica bloqueado | Aprobado | Paciente real de Clínica B consultado desde Clínica A respondió 404 |
| PROD-12 | Ruta web no autorizada | Aprobado | Admin clínica enviado de `/users` a `/forbidden` |
| PROD-13 | Logout y reutilización bloqueada | Aprobado | Logout 204; acceso y refresh posteriores respondieron 401 |
| PROD-14 | Restricciones de superadmin | Aprobado | Pacientes 403; médicos vacíos; usuarios limitados a admin/superadmin |
| PROD-15 | Restricciones de recepción | Aprobado | Consulta genérica de usuarios respondió 403 |
| PROD-16 | Refresh válido y credenciales inválidas | Aprobado | Refresh activo 200; contraseña incorrecta 401 |
| PROD-17 | Navegador de escritorio | Aprobado | Dashboard real, recarga protegida, 403 y logout comprobados |
| PROD-18 | Navegador móvil 390 x 844 | Aprobado | Login completo y sin desbordamiento horizontal |
| PROD-19 | Inicio de Expo contra API HTTPS | Aprobado | Metro activo en puerto 8081; API predeterminada `https://kp-software.tech/api/` |
| PROD-20 | Flujo en Android físico | Pendiente de prueba física | Requiere abrir `exp://192.168.101.27:8081` con Expo Go en la misma red |
| PROD-21 | Login por rol en dos clínicas | Aprobado | Admin, recepción/caja, enfermería, médico y paciente validaron login, `/auth/me/` y logout en A y B |

## Observaciones de despliegue

- MySQL advirtió que no aplica siete restricciones únicas condicionales de Django. No bloqueó el despliegue, pero deben mantenerse cubiertas por validación transaccional y pruebas.
- El build web conserva una advertencia de tamaño de chunk; no afecta la ejecución.
- Android físico no se marca como aprobado por inferencia.
- Caja comparte actualmente el rol de recepción; no existe un usuario de caja separado por decisión funcional del proyecto.

## Política de evidencia

- Las evidencias no muestran tokens, contraseñas ni información clínica real.
- Una prueba pendiente no se marca como aprobada sin ejecución directa.
- Los accesos utilizados son de demostración y no quedan guardados en este documento.
