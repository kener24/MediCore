# MediCore Mobile

Aplicación móvil de MediCore construida con Expo, React Native y TypeScript.

## Stack

- Expo SDK 54.
- React Native.
- TypeScript.
- React Navigation.
- Axios.
- Expo SecureStore para sesión JWT.

## Instalación

```bash
npm install
```

## Ejecutar en desarrollo

```bash
npx expo start
```

Para Expo Go en un teléfono físico:

```bash
npx expo start --lan
```

El teléfono y la computadora deben estar en la misma red Wi-Fi. Abre Expo Go y escanea el QR.

## API

La URL base está en:

```text
src/core/config/appConfig.ts
```

Valor actual:

```text
https://kp-software.tech/api
```

Si el certificado HTTPS no está disponible temporalmente, se puede cambiar a:

```text
http://kp-software.tech/api
```

No subas secretos, tokens, credenciales reales, archivos `.env`, builds ni llaves al repositorio.

## Roles soportados

- Paciente.
- Médico / doctor.
- Recepción, enfermería y administración quedan como shells móviles o pantallas no disponibles según avance.

## Estado actual

- Módulo paciente MVP.
- Módulo médico avanzado.
- Dashboard médico.
- Agenda.
- Sala de espera.
- Detalle de paciente.
- Triaje y signos vitales.
- Consultas.
- Recetas.
- Órdenes médicas.
- Consumos clínicos.
- Resumen y finalización de consulta.
- Perfil médico.
- Seguridad, cambio de contraseña y cierre de sesión.

Pendiente:

- Enfermería móvil.
- Recepción/caja móvil.
- Pruebas reales completas con usuarios productivos.
- Estabilización final para APK productivo.

## Validaciones locales

```bash
npx tsc --noEmit
npx expo-doctor
```

## APK preview con EAS

El archivo `eas.json` incluye un perfil `preview` para APK.

Comando futuro:

```bash
eas build -p android --profile preview
```

No ejecutes builds si TypeScript o Expo Doctor fallan.

## Acceso demo médico

```text
doctor@medicore.com
Doctor12345*
```

Estos accesos dependen de los datos seed del backend activo.

## GitHub

Si el proyecto móvil aún no tiene remoto:

```bash
git remote add origin URL_DEL_REPO
git branch -M main
git push -u origin main
```
