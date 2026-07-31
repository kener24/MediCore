# Gestión de dispositivos push del paciente

## Registro

La app conserva en `SecureStore` un identificador estable de instalación y registra plataforma, token del proveedor e instalación por las rutas del portal paciente. El token es de escritura y no se devuelve en listados ni se incluye en logs o auditoría.

El backend evita duplicados, valida propiedad de la instalación y responde con conflicto controlado si otro usuario intenta apropiarse de un identificador existente.

## Revocación

Logout, cierre remoto o desactivación revocan el dispositivo relacionado cuando existe. Los dispositivos revocados o inactivos no se seleccionan para nuevas notificaciones privadas.

Fallos permanentes del proveedor incrementan el contador, conservan un código no sensible y desactivan el token según la política. Fallos temporales no eliminan inmediatamente un dispositivo válido.

## Límite de certificación

Las pruebas automatizadas y la validación estática certifican registro, duplicados, propiedad y revocación. La entrega real del proveedor push solo puede declararse aprobada después de una prueba en una compilación Android física compatible; iniciar Expo Go no es evidencia suficiente.
