from django.db import models


class AuditLog(models.Model):
    class Action(models.TextChoices):
        LOGIN_SUCCESS = "login_success", "Login exitoso"
        LOGIN_FAILED = "login_failed", "Login fallido"
        LOGOUT = "logout", "Logout"
        CREATE = "create", "Crear"
        UPDATE = "update", "Actualizar"
        DELETE = "delete", "Eliminar"
        ACTIVATE = "activate", "Activar"
        DEACTIVATE = "deactivate", "Desactivar"
        VIEW = "view", "Ver"
        EXPORT = "export", "Exportar"
        APPROVE = "approve", "Aprobar"
        CANCEL = "cancel", "Cancelar"
        VOID = "void", "Anular"
        FINALIZE = "finalize", "Finalizar"
        ISSUE = "issue", "Emitir"
        PAYMENT = "payment", "Pago"
        STOCK_IN = "stock_in", "Entrada stock"
        STOCK_OUT = "stock_out", "Salida stock"
        STOCK_ADJUSTMENT = "stock_adjustment", "Ajuste stock"
        PURCHASE_RECEIVE = "purchase_receive", "Recepcion compra"
        PASSWORD_CHANGE = "password_change", "Cambio contrasena"
        PASSWORD_RESET = "password_reset", "Reset contrasena"
        PERMISSION_DENIED = "permission_denied", "Permiso denegado"
        SYSTEM_ERROR = "system_error", "Error sistema"

    class Module(models.TextChoices):
        AUTH = "auth", "Auth"
        USERS = "users", "Usuarios"
        CLINICS = "clinics", "Clinicas"
        DOCTORS = "doctors", "Medicos"
        PATIENTS = "patients", "Pacientes"
        APPOINTMENTS = "appointments", "Citas"
        MEDICAL_RECORDS = "medical_records", "Expedientes"
        CONSULTATIONS = "consultations", "Consultas"
        PRESCRIPTIONS = "prescriptions", "Recetas"
        BILLING = "billing", "Facturacion"
        PAYMENTS = "payments", "Pagos"
        CASH = "cash", "Caja"
        INVENTORY = "inventory", "Inventario"
        PURCHASES = "purchases", "Compras"
        REPORTS = "reports", "Reportes"
        SETTINGS = "settings", "Configuracion"
        SYSTEM = "system", "Sistema"

    class Severity(models.TextChoices):
        INFO = "info", "Info"
        WARNING = "warning", "Warning"
        ERROR = "error", "Error"
        CRITICAL = "critical", "Critical"

    clinic = models.ForeignKey("clinics.Clinic", on_delete=models.SET_NULL, null=True, blank=True, related_name="audit_logs")
    user = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="audit_logs")
    action = models.CharField(max_length=40, choices=Action.choices)
    module = models.CharField(max_length=40, choices=Module.choices)
    model_name = models.CharField(max_length=120, blank=True)
    object_id = models.CharField(max_length=80, blank=True)
    object_repr = models.CharField(max_length=250, blank=True)
    description = models.TextField(blank=True)
    severity = models.CharField(max_length=20, choices=Severity.choices, default=Severity.INFO)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    request_method = models.CharField(max_length=12, blank=True)
    request_path = models.CharField(max_length=300, blank=True)
    old_values = models.JSONField(default=dict, blank=True)
    new_values = models.JSONField(default=dict, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["clinic", "created_at"]),
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["action"]),
            models.Index(fields=["module"]),
            models.Index(fields=["severity"]),
            models.Index(fields=["created_at"]),
            models.Index(fields=["model_name", "object_id"]),
        ]

    def __str__(self):
        return f"{self.created_at:%Y-%m-%d %H:%M} {self.module}.{self.action}"

