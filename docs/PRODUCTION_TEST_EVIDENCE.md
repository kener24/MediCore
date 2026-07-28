# Evidencia de pruebas de produccion

## Sprint 1.4

### Resultado local

- `python manage.py check`: aprobado, 0 errores.
- `python manage.py makemigrations --check --dry-run`: sin cambios pendientes.
- Pruebas focalizadas Sprint 1.4: 7/7 aprobadas.
- Regresion facturacion/admisiones/auditoria/cuentas/pacientes: 142/142 aprobadas.
- Suite completa Django: 305/305 aprobadas en 1016.330 segundos.
- TypeScript web: aprobado.
- Build Vite: aprobado, 1850 modulos.
- ESLint: 0 errores; 60 advertencias preexistentes de deuda tecnica.
- TypeScript movil: aprobado.
- Expo Doctor: 18/18 controles aprobados.

### Produccion

Pendiente de completar despues del respaldo, despliegue y pruebas de humo. No registrar credenciales, tokens ni datos clinicos reales en este documento.

### Android fisico

Pendiente de confirmacion manual en dispositivo. El servidor Expo debe levantarse y probar login, caja, pago parcial, pago final, recibo, movimiento y cierre.
