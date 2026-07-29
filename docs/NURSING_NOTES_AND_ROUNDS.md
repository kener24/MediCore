# Notas y rondas de enfermería

## Notas

Las notas guardan internamiento, paciente, clínica, enfermera, tipo, prioridad lógica, turno y fecha. Los turnos soportados son mañana, tarde, noche y otro. Una nota registrada es inmutable; una corrección crea una nueva nota vinculada y exige motivo.

## Rondas

Las rondas registran condición general, dolor, conciencia, movilidad, alimentación, eliminación, observaciones y responsable. Admiten estados pendiente, completada, omitida, pendiente de revisión y cancelada.

Las rondas móviles usan `Idempotency-Key` para evitar duplicación por doble toque o reintento. No se permite escribir en internamientos cerrados ni de otra clínica.

Los signos hospitalarios se almacenan en `HospitalVitalSigns`, separados del triaje, y marcan alertas básicas sin generar diagnósticos automáticos.
