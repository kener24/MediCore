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
- Módulo enfermería / triaje inicial: dashboard, cola de triaje, pacientes en triaje, signos vitales de triaje, formulario de triaje, triajes realizados, notificaciones, perfil y seguridad.
- Sprint 4.3 hospitalización móvil:
  - Dashboard de hospitalización.
  - Pacientes internados.
  - Detalle de internamiento.
  - Habitación y cama asignada.
  - Signos vitales hospitalarios.
  - Historial de signos vitales hospitalarios.
  - Notas de enfermería.
  - Eventos de hospitalización.
  - Estado de camas.

## Separación clínica

Los signos vitales de triaje inicial y los signos vitales hospitalarios son módulos separados. Hospitalización usa endpoints `/hospitalization/...` y no consume endpoints administrativos ni de caja.

## Alcance futuro de enfermería

Sprint 4.4 recomendado:

- Rondas avanzadas.
- Administración de medicamentos.
- Seguimiento clínico más profundo de pacientes internados.
- Alertas clínicas configurables.

## Validaciones locales

```bash
npx tsc --noEmit
npx expo-doctor
```

No ejecutes builds si TypeScript o Expo Doctor fallan.

## Accesos demo

```text
Enfermería:
enfermera@medicore.com
Enfermera12345*

Doctor:
doctor@medicore.com
Doctor12345*

Paciente:
paciente@medicore.com
Paciente12345*
```

Los accesos dependen de los datos seed del backend activo.
