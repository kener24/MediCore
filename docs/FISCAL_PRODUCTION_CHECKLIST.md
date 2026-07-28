# Lista fiscal para produccion

## Validado tecnicamente

- Perfil fiscal completo por clinica.
- CAI y rango activo, vigente y no agotado.
- Correlativo protegido por `transaction.atomic()` y `select_for_update()`.
- Factura fiscal emitida inmutable en conceptos criticos.
- Anulacion sin borrar ni reutilizar correlativo.
- PDF con RTN, CAI, rango, fecha limite, numero fiscal, impuestos, pagos y saldo.
- Totales recalculados con `Decimal` en backend.
- Acceso limitado por clinica.

## Antes de uso fiscal real

1. Cargar datos fiscales reales de cada clinica y verificar respaldo documental.
2. Confirmar CAI, rango, establecimiento, punto de emision y fecha limite.
3. Ejecutar factura de prueba controlada y revisar original/copia.
4. Validar impuestos, exento, exonerado, ISV 15 e ISV 18.
5. Confirmar politica de notas de credito y anulaciones.
6. Validar el formato y las reglas con un contador hondureno o asesor fiscal.

La certificacion tecnica no sustituye validacion legal ni contable.
