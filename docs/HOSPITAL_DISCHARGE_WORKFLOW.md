# Flujo de alta hospitalaria

## Secuencia obligatoria

1. El médico solicita el alta; la cama continúa ocupada.
2. El médico prepara el resumen de egreso como borrador.
3. El autor firma el resumen.
4. Administración o recepción genera la factura hospitalaria.
5. Caja registra pagos o un administrador autoriza expresamente el saldo pendiente.
6. Se confirma el alta.
7. El internamiento y la visita se cierran.
8. Se cancelan indicaciones y dosis futuras.
9. La asignación termina y la cama pasa a `cleaning`.

El alta es idempotente: repetirla sobre un internamiento ya egresado devuelve el estado existente y no libera otra cama ni duplica factura.

## Bloqueos

No se completa el alta sin solicitud previa, resumen firmado y factura. Si existe saldo, solo el administrador de la clínica puede autorizar su continuidad mediante la acción explícita. La cama nunca pasa directamente a disponible; debe completar limpieza.

