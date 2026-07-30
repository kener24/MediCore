# Evidencia de certificación Sprint 1.6B

Fecha de validación local: 2026-07-29.

## Resultados locales

- Migraciones MySQL: aplicadas correctamente hasta `hospitalization.0005`.
- `python manage.py makemigrations --check`: sin cambios pendientes.
- `python manage.py check`: sin errores.
- Pruebas hospitalarias iniciales: 15 de 15 aprobadas.
- Suite completa: 346 pruebas aprobadas y 3 omitidas de forma prevista, sin fallos.
- Lint web: cero errores; permanecen advertencias históricas fuera del alcance.
- Build web de producción: aprobado.
- TypeScript móvil: aprobado.
- Expo Doctor: 18 de 18 comprobaciones aprobadas.
- Metro/Expo: iniciado correctamente en modo LAN y escuchando en el puerto 8081.

## Casos certificados

Se verificaron alergias con justificación médica, programación sin consumo, FEFO dividido, reintento idempotente, excepciones sin cargo, reversión al mismo lote, factura única, resumen firmado, alta segura, cama en limpieza, portal paciente y aislamiento entre clínicas.

## Producción

Pendiente de completar en esta misma entrega después de crear commits, subir el repositorio, respaldar la base de datos, ejecutar migraciones, compilar la web, reiniciar servicios y realizar pruebas no destructivas sobre la API real.

## Android físico

La validación estática y el inicio de Expo pueden certificarse desde el entorno de desarrollo. La interacción en un dispositivo Android físico requiere confirmación manual del usuario y no se declarará aprobada sin esa evidencia.
