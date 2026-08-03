from django.conf import settings
from django.core.cache import cache
from django.test import override_settings
from rest_framework_simplejwt.tokens import AccessToken

from apps.security.models import LoginAttempt
from tests.security.base import SecurityTestCase


class AuthenticationSecurityTests(SecurityTestCase):
    def test_login_failures_do_not_reveal_account_state(self):
        self.admin_a.is_active = False
        self.admin_a.save(update_fields=["is_active"])
        cases = [
            {"email": "missing@medicore.test", "password": "wrong"},
            {"email": self.admin_a.email, "password": "ValidPassword123!"},
            {"email": self.admin_b.email, "password": "wrong"},
        ]
        details = []
        for payload in cases:
            response = self.client.post("/api/auth/login/", payload, format="json")
            self.assertEqual(response.status_code, 401)
            details.append(response.data["detail"])
        self.assertEqual(details, ["Credenciales incorrectas."] * len(cases))

    def test_access_token_is_bound_to_created_session(self):
        data = self.login(self.admin_a)
        token = AccessToken(data["access"])
        self.assertEqual(token["sid"], data["session_key"])
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {data['access']}",
            HTTP_X_SESSION_KEY="session-key-manipulada",
        )
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 401)

    @override_settings(
        REST_FRAMEWORK={
            **settings.REST_FRAMEWORK,
            "DEFAULT_THROTTLE_RATES": {
                **settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"],
                "login_identifier": "2/minute",
                "login_ip": "100/minute",
            },
        }
    )
    def test_login_is_rate_limited_by_normalized_identifier(self):
        cache.clear()
        for email in [self.admin_a.email.upper(), f"  {self.admin_a.email}  "]:
            response = self.client.post("/api/auth/login/", {"email": email, "password": "wrong"}, format="json")
            self.assertEqual(response.status_code, 401)
        blocked = self.client.post("/api/auth/login/", {"email": self.admin_a.email, "password": "wrong"}, format="json")
        self.assertEqual(blocked.status_code, 429)
        self.assertIn("retry_after", blocked.data)
        self.assertEqual(LoginAttempt.objects.filter(user=self.admin_a, success=False).count(), 2)

    @override_settings(
        REST_FRAMEWORK={
            **settings.REST_FRAMEWORK,
            "DEFAULT_THROTTLE_RATES": {
                **settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"],
                "login_identifier": "100/minute",
                "login_ip": "2/minute",
            },
        }
    )
    def test_login_is_rate_limited_by_ip_across_identifiers(self):
        cache.clear()
        for index in range(2):
            response = self.client.post(
                "/api/auth/login/",
                {"email": f"missing-{index}@medicore.test", "password": "wrong"},
                format="json",
            )
            self.assertEqual(response.status_code, 401)
        blocked = self.client.post(
            "/api/auth/login/",
            {"email": "another-missing@medicore.test", "password": "wrong"},
            format="json",
        )
        self.assertEqual(blocked.status_code, 429)
