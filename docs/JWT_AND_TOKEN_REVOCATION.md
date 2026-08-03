# JWT y revocación

| Elemento | Política |
| --- | --- |
| Access | 60 minutos, firma SimpleJWT, claim mínimo `user_id` y `sid` |
| Refresh | 7 días como máximo, limitado además por vida de `UserSession` |
| Rotación | Activada |
| Blacklist tras rotación | Activada |
| Reutilización | Refresh anterior devuelve 401 |
| Revocación administrativa | Marca sesión inactiva; access y refresh dejan de autorizar |

El backend vuelve a cargar usuario, rol, clínica y sesión en cada request. Cambiar rol, desactivar usuario o suspender clínica no conserva privilegios por claims antiguos.
