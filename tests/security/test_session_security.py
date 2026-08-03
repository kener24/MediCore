from apps.security.models import UserSession
from tests.security.base import SecurityTestCase


class SessionSecurityTests(SecurityTestCase):
    def test_refresh_rotation_rejects_replay_and_accepts_rotated_token(self):
        login = self.login(self.admin_a)
        first = self.client.post(
            "/api/auth/refresh/",
            {"refresh": login["refresh"]},
            format="json",
            HTTP_X_SESSION_KEY=login["session_key"],
        )
        self.assertEqual(first.status_code, 200, first.data)
        self.assertNotEqual(first.data["refresh"], login["refresh"])
        replay = self.client.post(
            "/api/auth/refresh/",
            {"refresh": login["refresh"]},
            format="json",
            HTTP_X_SESSION_KEY=login["session_key"],
        )
        self.assertEqual(replay.status_code, 401)
        rotated = self.client.post(
            "/api/auth/refresh/",
            {"refresh": first.data["refresh"]},
            format="json",
            HTTP_X_SESSION_KEY=login["session_key"],
        )
        self.assertEqual(rotated.status_code, 200, rotated.data)

    def test_logout_revokes_server_session_and_refresh(self):
        login = self.login(self.admin_a)
        self.use_session(login)
        logout = self.client.post("/api/auth/logout/", {"refresh": login["refresh"]}, format="json")
        self.assertEqual(logout.status_code, 204)
        self.assertFalse(UserSession.objects.get(session_key=login["session_key"]).active)
        self.client.credentials(HTTP_X_SESSION_KEY=login["session_key"])
        retry = self.client.post("/api/auth/refresh/", {"refresh": login["refresh"]}, format="json")
        self.assertEqual(retry.status_code, 401)

    def test_password_change_revokes_other_device_but_keeps_current(self):
        device_a = self.login(self.admin_a)
        device_b = self.login(self.admin_a)
        self.use_session(device_a)
        changed = self.client.post(
            "/api/auth/change-password/",
            {
                "old_password": "ValidPassword123!",
                "new_password": "ChangedPassword123!",
                "confirm_password": "ChangedPassword123!",
            },
            format="json",
        )
        self.assertEqual(changed.status_code, 200, changed.data)
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 200)
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {device_b['access']}",
            HTTP_X_SESSION_KEY=device_b["session_key"],
        )
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 401)
