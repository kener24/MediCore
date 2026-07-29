# Evidencia de pruebas en producción

## Sprint 1.6A

Este archivo se completa con resultados verificables durante el despliegue. No contiene contraseñas ni información clínica real.

### Controles previos locales

- Migración `hospitalization.0003`: aplicada correctamente.
- `manage.py check`: correcto; aviso de remitente de correo local pendiente de configuración productiva.
- Suite enfocada: 20 pruebas correctas, una omitida por requerir MySQL.
- Diagnóstico de camas: consistente.
- Build web: correcto.
- TypeScript móvil: correcto.
- Lint Expo: correcto.

### Producción

Pendiente de completar automáticamente al desplegar: commit, migración MySQL, diagnóstico de camas, estado de Gunicorn/Nginx, comprobación HTTPS y pruebas API por Clínica A/B.

### Android físico

Requiere confirmación del usuario desde un dispositivo real. Expo se dejará disponible al final; no se afirmará una prueba física sin esa confirmación.
