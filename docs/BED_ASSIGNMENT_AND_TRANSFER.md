# Asignación y traslado de camas

## Fuente de verdad

`HospitalBedAssignment` con `released_at IS NULL` determina el ocupante. `HospitalBed.status` refleja el estado operativo y `Hospitalization.current_bed` apunta a la ubicación vigente.

## Asignación

`POST /api/hospitalization/admissions/{id}/assign-bed/` bloquea internamiento y cama con `select_for_update()`, vuelve a comprobar disponibilidad, crea la asignación y actualiza los tres registros dentro de `transaction.atomic()`.

## Traslado

`POST /api/hospitalization/admissions/{id}/change-bed/` exige motivo. Primero bloquea y valida la cama nueva; después cierra la asignación anterior, deja la cama anterior en limpieza, ocupa la nueva y conserva el historial.

## Restricciones

- No se asignan camas inactivas, ocupadas, en limpieza o mantenimiento.
- No se usan camas de otra clínica.
- No se elimina una cama o habitación con historial.
- No se cambia manualmente una cama ocupada a disponible.

El comando `audit_hospital_bed_consistency` es diagnóstico y no corrige datos automáticamente.
