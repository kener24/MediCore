# Matriz de roles y permisos

Fecha de revisión: 2026-08-03 (Sprint 1.9A)

Esta matriz describe el acceso esperado y certificado en el Sprint 1.0. Ocultar una opción en la interfaz no reemplaza el control del backend.

| Módulo o acción | Superadmin | Admin clínica | Recepción | Caja | Enfermería | Médico | Paciente |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Estado general del SaaS | Agregado | No | No | No | No | No | No |
| Clínicas, planes y suscripciones | Gestiona | Solo su suscripción | No | No | No | No | No |
| Administradores de clínica | Gestiona | No | No | No | No | No | No |
| Personal de clínica | No | Solo su clínica | No | No | No | No | No |
| Configuración fiscal | No emite por clínica | Solo su clínica | No | No | No | No | No |
| Pacientes | Sin detalle clínico | Su clínica | Datos administrativos | No | Datos necesarios | Asignados/permitidos | Solo propio |
| Citas | Sin detalle clínico | Su clínica | Gestiona | No | Consulta operativa | Agenda propia | Solo propias |
| Check-in y admisiones | No | Su clínica | Gestiona | No | Flujo permitido | Sala de espera | No |
| Triaje y signos vitales | No | Consulta operativa | No clínico | No | Gestiona | Consulta | No |
| Expediente completo | Bloqueado | Solo índice/inicialización, sin contenido | Bloqueado | Bloqueado | Permitido | Permitido | Resumen propio autorizado |
| Consultas clínicas | Bloqueado | Bloqueado | Bloqueado | Bloqueado | Lectura sin notas privadas | Crea y edita propias | Finalizadas propias sin notas privadas |
| Diagnósticos | Bloqueado | Lectura de su clínica | Bloqueado | Bloqueado | Lectura permitida | Gestiona propios | Lectura propia permitida |
| Recetas y órdenes | Bloqueado | Lectura de su clínica | Bloqueado | Bloqueado | Lectura permitida | Gestiona propias | Lectura propia emitida |
| Hospitalización | Bloqueado | Su clínica | Flujo administrativo | No | Seguimiento permitido | Seguimiento permitido | No |
| Documentos clínicos | Bloqueado | Su clínica | Solo administrativos no sensibles | No | Permitidos | Permitidos | Propios visibles |
| Facturas, pagos y caja | Sin detalle individual | Su clínica | Según rol combinado | Gestiona | No | No | Solo propios |
| Auditoría | Global permitida | Solo su clínica | No | No | No | No | No |
| Sesiones activas | Global administrable | Su clínica | Solo propia | Solo propia | Solo propia | Solo propia | Solo propia |

## Reglas de aislamiento

- Los usuarios de clínica operan únicamente con `request.user.clinica`.
- Los serializers rechazan relaciones con pacientes, citas, visitas, facturas, documentos o usuarios de otra clínica.
- El acceso cruzado por ID responde 403 o 404 y nunca devuelve el objeto.
- El superadmin administra la plataforma, pero los querysets clínicos identificables quedan vacíos o bloqueados.
- El paciente solo consulta recursos vinculados a su propia cuenta.
- Las mutaciones de consultas, diagnósticos, recetas y órdenes quedan limitadas al médico propietario cuando corresponden a criterio clínico.

## Rutas web sensibles

- `/users`, `/users/new`, `/users/:id`, `/roles` y `/clinics`: solo superadmin.
- `/superadmin/*`: solo superadmin.
- `/clinic/*`: admin o rol clínico expresamente permitido por la matriz central de rutas.
- `/doctor/*`: solo médico.
- `/patient/*`: solo paciente.
- Las rutas de perfil, seguridad y notificaciones propias requieren sesión, pero están disponibles para los roles autenticados.
