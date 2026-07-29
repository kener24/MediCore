# Alertas y tareas de inventario

## Alertas

`generate_inventory_alerts()` crea notificaciones internas para administradores de la clinica por:

- Stock actual menor o igual al minimo.
- Lote con saldo proximo a vencer.
- Lote con saldo vencido.

`INVENTORY_EXPIRATION_ALERT_DAYS` controla la ventana y vale 30 dias por defecto. No se repite una alerta activa del mismo objeto y destinatario. Cuando la condicion desaparece, la alerta se archiva y la resolucion queda auditada.

Cada alerta incluye clinica, producto o lote, saldo, severidad y enlace al modulo. Los destinatarios se consultan desde la misma clinica; no hay envios cruzados.

## Ejecucion

```bash
python manage.py generate_inventory_alerts
python manage.py generate_notifications --hours 24
```

Produccion reutiliza `medicore-notifications.timer`. El timer ejecuta cada hora `medicore-notifications.service`, que llama `generate_notifications`; no se instala una segunda infraestructura.

Verificacion:

```bash
systemctl status medicore-notifications.timer
systemctl list-timers medicore-notifications.timer
journalctl -u medicore-notifications.service --since today
```

