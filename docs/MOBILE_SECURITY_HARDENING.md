# Hardening móvil

- Tokens, sesión y perfil se almacenan en Expo SecureStore; nunca se almacena contraseña.
- API productiva usa `https://kp-software.tech/api`; no se desactiva TLS.
- Caché GET incorpora usuario, rol, clínica y sesión. No existe cola offline de mutaciones.
- Pagos, check-in, medicamentos, altas, permisos, inventario y emisión fiscal fallan sin red; no se confirman localmente.
- Logout/expiración limpia tokens, caché API, caché de enfermería, borradores/favoritos médicos y archivos temporales.
- Al quedar sin usuario se desmonta el navegador privado; atrás no restaura pantallas.
- IDs de notificaciones/deep links terminan en endpoints que vuelven a validar rol, propietario y clínica.

Las notificaciones push requieren development build/APK; Expo Go no certifica esa capacidad. Android físico queda como evidencia manual pendiente.
