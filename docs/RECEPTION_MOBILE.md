# Recepcion movil MediCore

## Alcance Sprint 5.0

Modulo movil para recepcion clinica. Permite buscar pacientes, crear paciente minimo, registrar admision/visita, hacer check-in de citas y revisar admisiones del dia.

## Estabilizacion Sprint 5.1

- Mensajes globales de API corregidos con tildes y sin errores tecnicos crudos.
- `normalizeListResponse` soporta listas, `results`, `data`, `items` y respuestas anidadas comunes.
- Busqueda exige minimo dos caracteres y muestra mensaje claro.
- Detalle de paciente controla `patientId` faltante.
- Detalle de visita controla `visitId` faltante.
- Cancelacion de admision requiere confirmacion.
- Detalle de paciente permite volver al flujo de admisiones de hoy.

## Roles permitidos

El helper `isReceptionRole` acepta `recepcionista`, `recepcion`, `recepción`, `receptionist`, `front_desk`, `admisiones` y `admissions`. No permite paciente, medico, enfermeria, admin ni superadmin.

## Endpoints usados

- `GET /patients/?search=`
- `GET /patients/{id}/`
- `POST /patients/`
- `GET /admissions/visits/?today=true`
- `POST /admissions/visits/`
- `GET /admissions/visits/{id}/`
- `PATCH /admissions/visits/{id}/`
- `GET /admissions/visits/stats-today/`
- `GET /appointments/?today=true`
- `POST /admissions/visits/check-in-appointment/`
- `GET /auth/me/`

## Flujo de prueba

1. Iniciar sesion con `recepcion@medicore.com`.
2. Abrir Recepcion.
3. Buscar paciente con dos o mas caracteres.
4. Crear paciente minimo si no existe.
5. Crear admision con paciente, tipo y motivo.
6. Abrir admisiones de hoy y ver detalle.
7. Enviar a triaje o medico si el backend lo permite.
8. Abrir citas y realizar check-in.
9. Cerrar sesion y verificar que no se vuelve al modulo con el boton atras.

## Seguridad

Recepcion no registra signos vitales, triaje, consultas, medicamentos, notas clinicas profundas ni altas hospitalarias. Todas las llamadas pasan por `apiClient`, con JWT Bearer y limpieza automatica de sesion ante 401.

## Limitaciones actuales

- Si el backend no tiene endpoint dedicado de cancelar admision, se intenta actualizar estado por `PATCH /admissions/visits/{id}/`.
- Si el backend no expone dashboard de recepcion, se construye resumen desde admisiones y citas del dia.
- La seleccion de medico queda por ID hasta que exista selector movil de medicos para recepcion.
- Enviar a triaje o medico depende de que el backend permita actualizar el estado operativo de la visita.
