# Evidencia de restauración de respaldo

Fecha UTC: 2026-08-04. Fuente: respaldo cifrado post-despliegue. Destino: base MySQL temporal aislada; nunca se escribió sobre `medicore_db`.

## Resultado

- Duración de importación, controles y limpieza: 11 segundos.
- Tablas restauradas: 77.
- Clínicas: 7; usuarios: 52; pacientes: 66.
- Citas: 229; consultas: 159.
- Facturas: 152; pagos: 94.
- Inventario: 6; hospitalizaciones: 1; auditoría: 751.
- Media referenciada: 5; archivos presentes: 5.
- Faltantes: 0; huérfanos: 0; rutas inseguras: 0.
- Base temporal eliminada al finalizar: confirmado.

El comando reproducible es:

```bash
sudo /var/www/medicore/deploy/scripts/restore-test.sh
```

Esta prueba demuestra restaurabilidad del backup actual. No sustituye un simulacro periódico de reconstrucción completa de servidor.
