from django.db import models


class PasswordResetToken(models.Model):
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="password_reset_tokens")
    token_hash = models.CharField(max_length=128, db_index=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class EmailVerificationToken(models.Model):
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="email_verification_tokens")
    token_hash = models.CharField(max_length=128, db_index=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class LoginAttempt(models.Model):
    email = models.EmailField(blank=True)
    user = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="login_attempts")
    success = models.BooleanField(default=False)
    failure_reason = models.CharField(max_length=180, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["email", "created_at"]), models.Index(fields=["user", "success"])]


class AccountLock(models.Model):
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="account_locks")
    locked_until = models.DateTimeField()
    reason = models.CharField(max_length=250, blank=True)
    failed_attempts = models.PositiveIntegerField(default=0)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    unlocked_at = models.DateTimeField(null=True, blank=True)
    unlocked_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="account_locks_unlocked")

    class Meta:
        ordering = ["-created_at"]


class UserSession(models.Model):
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="security_sessions")
    session_key = models.CharField(max_length=64, unique=True)
    refresh_token_hash = models.CharField(max_length=128, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    device_name = models.CharField(max_length=180, blank=True)
    last_activity_at = models.DateTimeField()
    expires_at = models.DateTimeField()
    revoked_at = models.DateTimeField(null=True, blank=True)
    revoked_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="security_sessions_revoked")
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-last_activity_at"]
        indexes = [models.Index(fields=["user", "active"]), models.Index(fields=["session_key"])]


class SecuritySetting(models.Model):
    clinic = models.ForeignKey("clinics.Clinic", on_delete=models.CASCADE, null=True, blank=True, related_name="security_settings")
    password_min_length = models.PositiveIntegerField(default=8)
    password_require_uppercase = models.BooleanField(default=True)
    password_require_lowercase = models.BooleanField(default=True)
    password_require_number = models.BooleanField(default=True)
    password_require_symbol = models.BooleanField(default=False)
    max_failed_login_attempts = models.PositiveIntegerField(default=5)
    lockout_minutes = models.PositiveIntegerField(default=15)
    password_reset_token_minutes = models.PositiveIntegerField(default=30)
    email_verification_token_minutes = models.PositiveIntegerField(default=60)
    session_lifetime_minutes = models.PositiveIntegerField(default=1440)
    require_email_verification = models.BooleanField(default=False)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["clinic"], name="unique_security_settings_per_clinic"),
            models.UniqueConstraint(fields=["active"], condition=models.Q(clinic__isnull=True, active=True), name="unique_active_global_security_settings"),
        ]
