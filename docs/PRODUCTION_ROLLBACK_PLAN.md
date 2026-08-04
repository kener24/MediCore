# Plan de rollback de producción

1. Registrar commit actual, commit estable anterior y motivo.
2. Confirmar respaldo cifrado verificado antes de cualquier cambio de datos.
3. Poner el sistema en ventana controlada si puede haber escrituras incompatibles.
4. Restaurar el código mediante un checkout controlado del commit, sin `reset --hard` automático.
5. Instalar dependencias solo desde archivos bloqueados, recompilar frontend y ejecutar `manage.py check`.
6. Reiniciar Gunicorn y recargar Nginx únicamente si las pruebas previas pasan.
7. Validar health/readiness, login, pacientes, citas, consulta, caja/fiscal, inventario, hospitalización, paciente, admin y superadmin.

Las migraciones destructivas no se revierten automáticamente. Si los modelos ya no son compatibles, se restaura el backup en una base nueva y se conserva la base fallida para análisis. El `.env` nunca se reemplaza desde Git.
