# Facturacion fiscal Honduras - Base operativa

Fecha: 2026-07-07

## Flujo de emision

1. La clinica completa su perfil fiscal.
2. La clinica crea un rango CAI activo para facturas.
3. La web consulta `/api/billing/fiscal-readiness/`.
4. Si el estado es `ready`, el usuario autorizado confirma la emision.
5. El backend valida perfil, rango, fecha limite, correlativo, cliente, items y permisos.
6. El backend asigna el numero fiscal dentro de una transaccion.
7. La factura queda emitida y ya no se puede editar ni borrar.
8. El PDF fiscal muestra CAI, rango, fecha limite, RTN, cliente, impuestos y total.

## Validaciones implementadas

- Perfil fiscal requerido.
- Facturacion fiscal habilitada.
- RTN emisor de 14 digitos.
- Razon social y direccion obligatorias.
- Rango CAI activo.
- CAI requerido.
- Fecha limite vigente.
- Correlativo dentro del rango.
- Items activos requeridos.
- Cliente con nombre.
- RTN del cliente si la clinica lo requiere.
- Factura no anulada.
- Factura no emitida previamente.
- Factura pertenece a la clinica del usuario.

## Permisos

- `admin`: configura fiscal, rangos, emite, anula y descarga PDF de su clinica.
- `recepcionista`: puede emitir/anular si opera facturacion.
- `recepcionista_caja` y `cajero`: pueden emitir/anular si el rol existe en la instalacion.
- `medico`, `enfermera`, `paciente`: no configuran ni emiten.
- `superadmin`: audita y consulta con parametro de clinica; no emite facturas clinicas por defecto.

## Advertencia

Esta implementacion es una base tecnica. Antes de usarla para facturacion real debe revisarse con contador o asesor fiscal hondureno para validar CAI, rangos, leyendas, datos obligatorios y procedimientos ante SAR.

## Pendiente Sprint 1B

- Nota de credito fiscal.
- Politica final de anulacion segun asesor fiscal.
- Validacion de formatos fiscales finales por contador.
