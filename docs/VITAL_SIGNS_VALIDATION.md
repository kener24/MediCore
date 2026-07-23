# Validación de signos vitales de triaje

## Unidades

| Campo | Unidad |
| --- | --- |
| Temperatura | grados Celsius |
| Presión arterial | mmHg |
| Frecuencia cardíaca | latidos por minuto |
| Frecuencia respiratoria | respiraciones por minuto |
| Saturación | porcentaje |
| Peso | kilogramos |
| Altura | metros en backend; centímetros en móvil convertidos antes de enviar |
| Glucosa | unidad registrada por el flujo actual |
| Dolor | escala de 0 a 10 |

## Validaciones bloqueantes

- Al menos un signo vital.
- Campos numéricos y positivos dentro de límites físicamente razonables.
- Presión sistólica y diastólica se registran juntas.
- Sistólica mayor que diastólica.
- Peso y altura se registran juntos.
- Saturación entre 0 y 100.
- Dolor entre 0 y 10.
- Visita en `in_triage`, misma clínica y usuario autorizado.

## Advertencias confirmables

Los valores clínicamente inusuales no se convierten en diagnóstico ni se bloquean de forma automática. Se solicita confirmación para temperatura menor de 35 o desde 38, saturación menor de 92, frecuencia cardíaca menor de 50 o mayor de 120, respiración menor de 10 o mayor de 24, presión crítica o baja, dolor desde 8 y glucosa menor de 70 o mayor de 250.

El cliente reenvía `confirm_out_of_range: true`; el backend guarda una auditoría de la confirmación sin copiar valores clínicos sensibles al texto del log.

## IMC

El móvil calcula una vista previa con centímetros. Antes de enviar convierte la altura a metros. El backend vuelve a calcular `peso / altura²`, redondea a dos decimales y es la fuente final. No se acepta peso sin altura ni altura cero.

## Duplicados

Un segundo guardado durante el mismo triaje actualiza el registro inicial existente bajo bloqueo de la visita. No se crean signos de hospitalización ni registros iniciales duplicados.

La configuración de rangos clínicos por clínica queda fuera de este sprint y se mantiene como mejora futura.
