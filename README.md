# MediCore Mobile

Aplicación móvil Expo/React Native para MediCore. La app usa navegación por rol y consume las API publicadas del backend.

## Requisitos

- Node.js LTS.
- npm.
- Expo Go compatible con SDK 54, o un development build generado con EAS.
- Backend disponible en `https://kp-software.tech/api`.

## Comandos locales

```bash
npm install
npx expo start --lan
```

Para validar TypeScript:

```bash
npx tsc --noEmit
```

Para revisar compatibilidad Expo:

```bash
npx expo-doctor
```

## API

La URL base está configurada en:

```text
src/core/config/appConfig.ts
```

Valor actual:

```text
https://kp-software.tech/api
```

No guardes tokens ni credenciales reales en el repositorio. El token JWT se maneja desde almacenamiento seguro y se envía como `Authorization: Bearer`.

## Módulo médico

El módulo de médico incluye:

- Dashboard médico.
- Agenda.
- Sala de espera.
- Detalle de paciente y triaje.
- Consulta médica.
- Recetas médicas.
- Órdenes médicas.
- Consumo clínico.
- Resumen y finalización de consulta.

Las recetas, órdenes y consumos quedan en modo lectura cuando la consulta ya está finalizada.

## Acceso de prueba

Usuario médico demo:

```text
doctor@medicore.com
Doctor12345*
```

Estos accesos dependen de los seeds/datos del backend activo.

## Expo Go

1. Ejecuta `npx expo start --lan`.
2. Abre Expo Go en el teléfono.
3. Escanea el QR que muestra la terminal.
4. El teléfono y la computadora deben estar en la misma red.

Si Expo Go indica incompatibilidad de versión, instala un Expo Go compatible con SDK 54 o usa EAS Development Build.
