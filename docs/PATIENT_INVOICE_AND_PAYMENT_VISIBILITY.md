# Visibilidad de facturas y pagos del paciente

## Regla de propiedad

El cliente no selecciona `patient_id` ni `clinic_id`. La API obtiene el perfil paciente desde la sesión y aplica simultáneamente:

- usuario autenticado y activo;
- rol paciente;
- paciente vinculado y activo;
- clínica activa y coincidente;
- suscripción y portal habilitados;
- permiso específico de facturas, pagos, PDF o recibo;
- recurso perteneciente al paciente.

## Información visible

Las facturas muestran número, número fiscal permitido, fecha, clínica, estado comprensible, conceptos, descuentos, impuestos, total, pagos aplicados y saldo. Los pagos muestran número, factura, fecha, monto, método, referencia protegida, estado, saldos anterior y posterior y clínica.

## Información excluida

No se publican sesión de caja, arqueo, diferencias, usuario receptor completo, movimientos internos, costos, margen, auditoría, tokens ni información de otros pacientes. Los pagos anulados permanecen visibles como historial de solo lectura y no permiten descargar un recibo válido.

## Configuración deshabilitada

La navegación se oculta cuando corresponde, pero el backend también bloquea el endpoint. El mensaje funcional es: `Tu clínica no ha habilitado esta información en el portal.`
