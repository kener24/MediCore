import hashlib

from django.conf import settings
from rest_framework.throttling import SimpleRateThrottle


class DynamicSecurityRateThrottle(SimpleRateThrottle):
    def get_rate(self):
        return settings.REST_FRAMEWORK.get("DEFAULT_THROTTLE_RATES", {}).get(self.scope)


class LoginIPRateThrottle(DynamicSecurityRateThrottle):
    scope = "login_ip"

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


class LoginIdentifierRateThrottle(DynamicSecurityRateThrottle):
    scope = "login_identifier"

    def get_cache_key(self, request, view):
        email = str(request.data.get("email") or "").strip().lower()
        if not email:
            return None
        digest = hashlib.sha256(email.encode("utf-8")).hexdigest()
        return self.cache_format % {"scope": self.scope, "ident": digest}
