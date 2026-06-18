from django.db import models


class AuditLog(models.Model):
    class Action(models.TextChoices):
        LOGIN = "login", "Login"
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
        PRINT = "print", "Imprimir"
        DOWNLOAD = "download", "Descargar"
        APPROVE = "approve", "Aprobar"
        REJECT = "reject", "Rechazar"
        CANCEL = "cancel", "Cancelar"
        VOID = "void", "Anular"
        COMPLETE = "complete", "Completar"
        FINALIZE = "finalize", "Finalizar"
        ISSUE = "issue", "Emitir"
        INVOICE = "invoice", "Facturar"
        PAYMENT = "payment", "Pago"
        PAY = "pay", "Pagar"
        STOCK_IN = "stock_in", "Entrada stock"
        STOCK_OUT = "stock_out", "Salida stock"
        STOCK_ADJUSTMENT = "stock_adjustment", "Ajuste stock"
        PURCHASE_RECEIVE = "purchase_receive", "Recepcion compra"
        PASSWORD_CHANGE = "password_change", "Cambio contrasena"
        PASSWORD_RESET = "password_reset", "Reset contrasena"
        PERMISSION_CHANGE = "permission_change", "Cambio permisos"
        SETTINGS_CHANGE = "settings_change", "Cambio configuracion"
        PERMISSION_DENIED = "permission_denied", "Permiso denegado"
        SYSTEM_ERROR = "system_error", "Error sistema"

    class Module(models.TextChoices):
        AUTH = "auth", "Auth"
        USERS = "users", "Usuarios"
        CLINICS = "clinics", "Clinicas"
        DOCTORS = "doctors", "Medicos"
        PATIENTS = "patients", "Pacientes"
        APPOINTMENTS = "appointments", "Citas"
        ADMISSIONS = "admissions", "Admisiones"
        TRIAGE = "triage", "Triaje"
        MEDICAL_RECORDS = "medical_records", "Expedientes"
        CONSULTATIONS = "consultations", "Consultas"
        PRESCRIPTIONS = "prescriptions", "Recetas"
        MEDICAL_ORDERS = "medical_orders", "Ordenes medicas"
        BILLING = "billing", "Facturacion"
        PAYMENTS = "payments", "Pagos"
        CASH = "cash", "Caja"
        INVENTORY = "inventory", "Inventario"
        PURCHASES = "purchases", "Compras"
        DOCUMENTS = "documents", "Documentos"
        REPORTS = "reports", "Reportes"
        SETTINGS = "settings", "Configuracion"
        SUBSCRIPTIONS = "subscriptions", "Suscripciones"
        SECURITY = "security", "Seguridad"
        SYSTEM = "system", "Sistema"

    class Severity(models.TextChoices):
        INFO = "info", "Info"
        WARNING = "warning", "Warning"
        ERROR = "error", "Error"
        CRITICAL = "critical", "Critical"

    class Status(models.TextChoices):
        SUCCESS = "success", "Exitoso"
        FAILED = "failed", "Fallido"
        WARNING = "warning", "Advertencia"

    clinic = models.ForeignKey("clinics.Clinic", on_delete=models.SET_NULL, null=True, blank=True, related_name="audit_logs")
    user = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="audit_logs")
    user_email = models.EmailField(blank=True, default="")
    user_role = models.CharField(max_length=80, blank=True, default="")
    action = models.CharField(max_length=80, choices=Action.choices, db_index=True)
    module = models.CharField(max_length=80, choices=Module.choices, db_index=True)
    object_type = models.CharField(max_length=120, blank=True, default="")
    model_name = models.CharField(max_length=120, blank=True)
    object_id = models.CharField(max_length=80, blank=True)
    object_repr = models.CharField(max_length=250, blank=True)
    description = models.TextField(blank=True)
    before_data = models.JSONField(default=dict, blank=True)
    after_data = models.JSONField(default=dict, blank=True)
    changes = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.SUCCESS, db_index=True)
    severity = models.CharField(max_length=30, choices=Severity.choices, default=Severity.INFO, db_index=True)
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
            models.Index(fields=["module", "created_at"]),
            models.Index(fields=["action", "created_at"]),
            models.Index(fields=["severity", "created_at"]),
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["object_type", "object_id"]),
            models.Index(fields=["action"]),
            models.Index(fields=["module"]),
            models.Index(fields=["severity"]),
            models.Index(fields=["created_at"]),
            models.Index(fields=["model_name", "object_id"]),
        ]

    def __str__(self):
        return f"{self.created_at:%Y-%m-%d %H:%M} {self.module}.{self.action}"
