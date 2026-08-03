# Restricción de datos clínicos del superadministrador

El superadministrador opera el SaaS, no actúa como médico global.

Se verifican bloqueos o conjuntos vacíos para pacientes, expedientes, consultas, diagnósticos, recetas, órdenes, signos vitales, hospitalización, documentos, inventario operativo, compras y facturas clínicas individuales.

Los endpoints administrativos solo exponen conteos y estados. Los documentos clínicos no pueden listarse ni descargarse. Los módulos de inventario y compras dejaron de otorgar alcance global al superadministrador.

Las pruebas de regresión se encuentran en `apps/accounts/test_sprint18b_superadmin_certification.py` y complementan las pruebas específicas existentes de pacientes, citas, expedientes, recetas, documentos y hospitalización.
