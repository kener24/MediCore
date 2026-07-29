# Pruebas multi-clínica de hospitalización

La suite usa Clínica A y Clínica B con pacientes, médicos, enfermeras, habitaciones y camas independientes.

Se verificó que:

- un usuario A no recupera internamientos B;
- un ingreso A no acepta paciente, visita, consulta, médico o cama B;
- una cama B no puede asignarse a un internamiento A;
- médico y enfermería A no escriben sobre objetos B;
- paciente y superadmin reciben recurso oculto;
- recepción no recibe contenido clínico profundo;
- los IDs manipulados producen `403` o `404`, nunca datos ajenos.

La prueba `test_sprint16a_concurrency.py` ejecuta dos asignaciones simultáneas y se habilita exclusivamente con MySQL, donde existe bloqueo real de filas.
