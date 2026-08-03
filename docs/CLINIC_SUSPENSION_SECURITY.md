# Seguridad al suspender una clínica

1. El superadministrador confirma la acción e indica un motivo.
2. Backend bloquea la clínica dentro de una transacción.
3. Se revocan todas las sesiones activas de usuarios ligados a esa clínica.
4. Nuevos inicios de sesión y renovaciones de token son rechazados.
5. Los datos clínicos, fiscales, financieros, usuarios y auditoría permanecen intactos.
6. Otras clínicas no cambian de estado ni pierden sesiones.
7. Al reactivar, los usuarios deben autenticarse de nuevo; los tokens anteriores siguen revocados.

La acción registra actor, motivo, cantidad de usuarios afectados, antes/después, IP y agente de usuario. La API no ofrece borrado físico de clínicas.
