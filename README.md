# MediCore Mobile

Aplicación móvil de MediCore construida con Expo, React Native y TypeScript.

## Stack

- Expo SDK 54.
- React Native.
- TypeScript.
- React Navigation.
- Axios.
- Expo SecureStore para sesión JWT.

## Ejecutar en desarrollo

```bash
npm install
npx expo start --lan
```

El teléfono y la computadora deben estar en la misma red Wi-Fi. Abre Expo Go y escanea el QR que muestra Metro.

## API

La URL base está en:

```text
src/core/config/appConfig.ts
```

Valor esperado:

```text
https://kp-software.tech/api
```

Todas las peticiones usan el `apiClient` centralizado con `Authorization: Bearer`.

## Roles soportados

- Paciente.
- Médico / doctor.
- Enfermería: acepta `enfermera`, `enfermero`, `enfermeria`, `enfermería`, `nurse` y `nursing`.
- Recepción.
- Administración.

## Estado actual

- Login funcional con JWT.
- Módulo paciente MVP.
- Módulo médico avanzado: dashboard, agenda, sala, detalle de paciente, consultas, recetas, órdenes, consumos clínicos, perfil y seguridad.
- Sprint 4.0 enfermería / triaje inicial móvil:
  - Dashboard de enfermería.
  - Cola de pacientes esperando triaje.
  - Pacientes en triaje.
  - Detalle básico del paciente.
  - Inicio de triaje.
  - Registro de signos vitales con validaciones e IMC.
  - Formulario de triaje con prioridad.
  - Envío del paciente al médico.
  - Triajes realizados.
  - Detalle de triaje.
  - Notificaciones.
  - Perfil, seguridad y logout.
- Sprint 4.1 estabilización enfermería / triaje móvil:
  - Tabs finales: Inicio, Triaje, Signos, Pacientes y Perfil.
  - Validación de acceso exclusiva para rol enfermería.
  - Manejo de `visitId` faltante en detalle, signos y triaje.
  - Normalización de listas DRF y respuestas anidadas.
  - Endpoints alineados con visitas clínicas del backend.
  - Errores globales en español limpio, sin mostrar detalles técnicos.
  - Safe area, teclado y padding inferior revisados en pantallas críticas.

## Alcance futuro de enfermería

Este sprint cubre triaje inicial. Hospitalización no debe mezclarse con triaje.

Próximos sprints recomendados:

- Sprint 4.1: estabilización de enfermería / triaje móvil con endpoints productivos definitivos.
- Sprint 4.2: hospitalización web + backend.
- Sprint 4.3: hospitalización móvil.
- Sprint 4.4: rondas, seguimiento y administración de medicamentos web + móvil.

## Validaciones locales

```bash
npx tsc --noEmit
npx expo-doctor
```

No ejecutes builds si TypeScript o Expo Doctor fallan.

## Acceso demo médico

```text
doctor@medicore.com
Doctor12345*
```

Los accesos dependen de los datos seed del backend activo.
