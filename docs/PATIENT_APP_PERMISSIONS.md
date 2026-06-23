# Permisos App Paciente - MediCore

Fecha: 2026-06-22

## Roles aceptados

La app movil acepta como rol paciente:

- `paciente`
- `patient`

Internamente ambos se resuelven como `paciente` para usar el mismo flujo de navegacion.

## Proteccion en mobile

| Capa | Archivo | Proteccion |
|---|---|---|
| Resolver rol | `src/core/utils/roleUtils.ts` | `isPatientRole` acepta `paciente` y `patient`. |
| Navegacion raiz | `src/navigation/RoleNavigator.tsx` | Solo `appRole = paciente` abre `PatientTabs`. |
| Tabs paciente | `src/navigation/PatientTabs.tsx` | Envuelve todo con `RoleGuard roles={['paciente']}`. |
| Guardia UI | `src/components/RoleGuard.tsx` | Bloquea si no hay usuario, rol o rol permitido. |

## Proteccion en backend

| Capa | Archivo | Proteccion |
|---|---|---|
| Paciente asociado | `apps.patient_portal.views.patient_for_user` | Busca `Patient` activo vinculado a `request.user`. |
| Rol paciente | `PatientPortalBaseView.initial` | Acepta `paciente` o `patient`. |
| Portal habilitado | `PatientPortalBaseView.initial` | Valida `allow_patient_portal`. |
| Suscripcion | `PatientPortalBaseView.initial` | Valida suscripcion activa y feature `patient_portal`. |
| Filtro de datos | Vistas patient portal | Todas filtran por `self.patient`. |

## Reglas de seguridad verificadas

- Paciente no debe ver datos de otro paciente.
- Paciente no debe entrar a medico, recepcion, caja, enfermeria, admin ni superadmin.
- Las pantallas paciente no solo se ocultan; el stack completo esta protegido por `RoleGuard`.
- Backend exige usuario autenticado y paciente vinculado.
- Las consultas principales filtran por `patient=self.patient`.

## Pendientes recomendados

- Agregar endpoint dedicado para marcar notificacion leida desde portal paciente.
- Agregar pruebas backend especificas para rol `patient`.
- Probar en Android fisico con usuario paciente real.

