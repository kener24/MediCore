ROLE_PERMISSION_GROUPS = {
    "superadmin": {
        "Sistema": [
            "Ver dashboard global",
            "Gestionar clínicas",
            "Auditar actividad global",
            "Cerrar sesiones remotas",
            "Ver reportes SaaS",
        ],
        "Usuarios": ["Gestionar usuarios globales", "Reasignar administradores", "Ver roles del sistema"],
        "Seguridad": ["Configurar politicas de seguridad", "Revisar bloqueos", "Auditar logins fallidos"],
    },
    "admin": {
        "Administración": [
            "Gestionar equipo de clínica",
            "Crear médicos",
            "Crear enfermería",
            "Crear recepción",
            "Ver sesiones activas de la clínica",
        ],
        "Operación": ["Configurar clínica", "Gestionar agenda", "Ver reportes operativos", "Ver auditoría de clínica"],
        "Finanzas": ["Configurar fiscal", "Gestionar CAI", "Ver facturación", "Autorizar anulaciones"],
    },
    "recepcionista": {
        "Recepción": ["Crear pacientes", "Gestionar citas", "Registrar admisiones", "Hacer check-in"],
        "Caja": ["Ver facturas", "Registrar pagos", "Abrir caja", "Cerrar caja", "Registrar movimientos de caja"],
        "Consulta": ["Enviar a triaje", "Enviar a médico", "Consultar saldos"],
    },
    "cajero": {
        "Caja": ["Ver facturas", "Registrar pagos", "Abrir caja", "Cerrar caja", "Registrar movimientos de caja"],
        "Facturación": ["Imprimir factura", "Consultar pagos", "Ver saldos pendientes"],
    },
    "recepcionista_caja": {
        "Recepción": ["Crear pacientes", "Gestionar citas", "Registrar admisiones", "Hacer check-in"],
        "Caja": ["Ver facturas", "Registrar pagos", "Abrir caja", "Cerrar caja", "Registrar movimientos de caja"],
        "Facturación": ["Imprimir factura", "Consultar pagos", "Ver saldos pendientes"],
    },
    "medico": {
        "Clínico": ["Ver agenda propia", "Iniciar consulta", "Editar borrador clínico", "Finalizar consulta"],
        "Expediente": ["Ver expediente clínico", "Crear recetas", "Crear órdenes médicas", "Registrar consumos clínicos"],
    },
    "enfermera": {
        "Triaje": ["Ver cola de triaje", "Registrar signos vitales", "Asignar prioridad clínica"],
        "Hospitalización": ["Ver pacientes hospitalizados", "Registrar notas de enfermería", "Administrar medicamentos"],
    },
    "paciente": {
        "Portal": ["Ver citas propias", "Solicitar citas", "Ver facturas propias", "Ver pagos propios"],
        "Cuenta": ["Editar perfil propio", "Cambiar contraseña", "Ver notificaciones"],
    },
}


def permissions_for_role(role_name):
    groups = ROLE_PERMISSION_GROUPS.get(role_name, {})
    flat = []
    for permissions in groups.values():
        flat.extend(permissions)
    return {"groups": groups, "permissions": flat}
