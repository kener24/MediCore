# Funciones y límites de planes SaaS

## Modelo reutilizado

`SubscriptionPlan` mantiene precios, estado, soporte, límites y funciones existentes. No se crearon modelos de planes duplicados.

## Límites backend

- Usuarios.
- Médicos.
- Pacientes.
- Citas mensuales.
- Almacenamiento reportado.

Las altas de usuarios, médicos, pacientes y citas consultan el límite en backend. Al reducir un plan por debajo del uso actual no se eliminan registros: se conserva la información, se muestra sobreuso y se bloquean nuevas altas.

## Funciones existentes

Facturación, inventario, compras, reportes, auditoría, notificaciones, portal paciente y acceso móvil. El sprint no inventa funciones inexistentes. El portal paciente ya aplica su feature flag en backend; los módulos administrativos conservan lectura histórica y restringen las acciones conforme a sus permisos.

Crear, editar o archivar un plan genera auditoría. Archivar no elimina suscripciones existentes.
