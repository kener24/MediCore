from django.db import models

from apps.core.models import TimeStampedModel


class Notification(TimeStampedModel):
    class Type(models.TextChoices):
        INFO = "info", "Info"
        REMINDER = "reminder", "Reminder"
        ALERT = "alert", "Alert"
        WARNING = "warning", "Warning"
        SUCCESS = "success", "Success"
        ERROR = "error", "Error"

    class Module(models.TextChoices):
        SYSTEM = "system", "System"
        AUTH = "auth", "Auth"
        APPOINTMENTS = "appointments", "Appointments"
        PATIENTS = "patients", "Patients"
        DOCTORS = "doctors", "Doctors"
        MEDICAL_RECORDS = "medical_records", "Medical records"
        CONSULTATIONS = "consultations", "Consultations"
        PRESCRIPTIONS = "prescriptions", "Prescriptions"
        BILLING = "billing", "Billing"
        PAYMENTS = "payments", "Payments"
        CASH = "cash", "Cash"
        INVENTORY = "inventory", "Inventory"
        PURCHASES = "purchases", "Purchases"
        REPORTS = "reports", "Reports"
        AUDIT = "audit", "Audit"

    class Priority(models.TextChoices):
        LOW = "low", "Low"
        NORMAL = "normal", "Normal"
        HIGH = "high", "High"
        URGENT = "urgent", "Urgent"

    class Status(models.TextChoices):
        UNREAD = "unread", "Unread"
        READ = "read", "Read"
        ARCHIVED = "archived", "Archived"

    clinic = models.ForeignKey("clinics.Clinic", on_delete=models.SET_NULL, null=True, blank=True, related_name="notifications")
    recipient = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="notifications")
    title = models.CharField(max_length=180)
    message = models.TextField()
    notification_type = models.CharField(max_length=20, choices=Type.choices, default=Type.INFO)
    module = models.CharField(max_length=40, choices=Module.choices, default=Module.SYSTEM)
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.NORMAL)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.UNREAD)
    related_model = models.CharField(max_length=120, blank=True)
    related_object_id = models.CharField(max_length=80, blank=True)
    action_url = models.CharField(max_length=300, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-creado_en"]
        indexes = [
            models.Index(fields=["recipient", "status", "creado_en"]),
            models.Index(fields=["clinic", "creado_en"]),
            models.Index(fields=["status"]),
            models.Index(fields=["module"]),
            models.Index(fields=["notification_type"]),
            models.Index(fields=["priority"]),
            models.Index(fields=["read_at"]),
        ]

    def __str__(self):
        return f"{self.recipient_id} - {self.title}"


class NotificationPreference(TimeStampedModel):
    user = models.OneToOneField("accounts.User", on_delete=models.CASCADE, related_name="notification_preferences")
    receive_appointment_reminders = models.BooleanField(default=True)
    receive_billing_alerts = models.BooleanField(default=True)
    receive_inventory_alerts = models.BooleanField(default=True)
    receive_purchase_alerts = models.BooleanField(default=True)
    receive_audit_alerts = models.BooleanField(default=True)
    receive_system_notifications = models.BooleanField(default=True)
    email_enabled = models.BooleanField(default=False)
    sms_enabled = models.BooleanField(default=False)
    whatsapp_enabled = models.BooleanField(default=False)
    push_enabled = models.BooleanField(default=False)

    def __str__(self):
        return f"Preferencias {self.user_id}"

