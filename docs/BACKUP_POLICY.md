# Política de respaldos

MediCore respalda diariamente la base MySQL completa, `media` y configuraciones operativas no secretas. Nunca incluye `.env`, claves privadas, tokens ni contraseñas.

El archivo se cifra con AES-256-CBC y PBKDF2. La clave tiene permisos exclusivos de `root` y se custodia separada del respaldo. Cada ejecución verifica existencia, tamaño, descifrado, SHA-256, gzip y estructura tar antes de publicar estado `verified`.

El 2026-08-04 se generó y verificó `medicore-20260804T052734Z.tar.enc` (191 KiB). Se copió manualmente fuera de la instancia junto con su clave, en archivos separados, y se comprobó el SHA-256 `f1b8237807fec0c12705330030e2aa97c02aaf2d0ea3f83a422b24238f0df7d7`.

La copia externa actual protege este punto de recuperación, pero no automatiza futuras copias. Para cubrir pérdida total de instancia de forma continua debe montarse un destino externo y configurar `MEDICORE_OFFSITE_DIR`, o integrar almacenamiento cifrado aprobado.
