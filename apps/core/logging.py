import logging
import re

from apps.core.request_context import get_current_request_id


REDACTION_PATTERNS = (
    re.compile(r"(?i)(authorization\s*[:=]\s*bearer\s+)[^\s,;]+"),
    re.compile(r"(?i)((?:password|refresh|access|token|secret|api[_-]?key)\s*[:=]\s*)[^\s,;]+"),
)


class SensitiveDataFilter(logging.Filter):
    def filter(self, record):
        request = getattr(record, "request", None)
        record.request_id = (
            getattr(record, "request_id", "")
            or getattr(request, "request_id", "")
            or get_current_request_id()
        )
        message = record.getMessage()
        for pattern in REDACTION_PATTERNS:
            message = pattern.sub(r"\1[REDACTED]", message)
        record.msg = message
        record.args = ()
        return True
