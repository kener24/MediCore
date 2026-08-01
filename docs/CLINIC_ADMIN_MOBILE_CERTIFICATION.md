# Certificacion movil del administrador de clinica

## Alcance

El Sprint 1.8A certifica y corrige el modulo existente del administrador de clinica sin duplicar modelos ni funciones del superadministrador. Reutiliza `Clinic`, `User`, `Role`, `DoctorProfile`, `DoctorSchedule`, `UserSession`, `AuditLog`, citas, admisiones, caja, facturacion e inventario.

## Flujos disponibles

- Dashboard agregado con periodos hoy, siete dias y mes.
- Usuarios de la clinica con busqueda, rol, estado y sesion activa.
- Alta de enfermeria, recepcion, recepcion/caja y medicos.
- Edicion autorizada, activacion, desactivacion y recuperacion de contrasena.
- Revocacion individual o total de sesiones con motivo.
- Perfil medico y horarios semanales basicos.
- Alertas operativas y estado de la clinica.
- Configuracion administrativa basica, fiscal visible, auditoria y bloqueos.

## Seguridad

La clinica procede del usuario autenticado. El movil no selecciona ni envia `clinic_id`. Los recursos ajenos y superadministradores quedan fuera del queryset. Las mutaciones criticas se bloquean sin conexion y el logout limpia cache por usuario, clinica y sesion.

## Estado de certificacion

- Backend automatizado: aprobado.
- Compilacion web: aprobada.
- TypeScript, lint y Expo Doctor: aprobados.
- Produccion: desplegada y certificada por HTTPS, servicios y pruebas API de aislamiento; ver `PRODUCTION_TEST_EVIDENCE.md`.
- Android fisico: requiere ejecucion manual por el propietario; no se sustituye con Expo web.

## Limite consciente

El modelo actual soporta horarios semanales, pero no dispone de una entidad independiente de bloqueos de agenda. No se creo una tabla nueva en este sprint. Vacaciones y ausencias quedan para Sprint 1.8B.
