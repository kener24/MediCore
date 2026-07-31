# Pruebas finales de la aplicación paciente - Sprint 1.7B

## Validación automatizada y estática

La cobertura dirigida incluye propiedad de facturas, pagos, notas de crédito, PDFs, recibos, notificaciones, preferencias, dispositivos push y sesiones propias. Web y móvil validan tipos, rutas, errores, expiración y limpieza local.

Comandos requeridos:

```text
python manage.py check
python manage.py test
npm run build
npx tsc --noEmit
npm run lint
npx expo-doctor
npx expo export --platform android
```

Los resultados y fechas reales se registran en `PRODUCTION_TEST_EVIDENCE.md` al terminar el despliegue.

## Matriz manual Android pendiente de evidencia física

Debe recorrerse en un dispositivo Android: login, restauración, dashboard, facturas, PDF, pagos, recibo, nota de crédito, notificaciones, deep links, preferencias, push real, sesiones, refresh, inactividad, pérdida y regreso de conexión, timeout, logout y cambio entre pacientes.

También debe comprobarse teléfono pequeño, texto aumentado, teclado, scroll, botón atrás y ausencia de datos del usuario anterior. Esta matriz no se marca aprobada únicamente con TypeScript, Expo Doctor, exportación Android o Expo Go.

## Criterio de cierre

El sprint puede certificar código, APIs, builds y producción desde automatización. Android físico y entrega push quedan explícitamente pendientes hasta contar con interacción y evidencia del dispositivo.
