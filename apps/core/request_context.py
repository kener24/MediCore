from contextvars import ContextVar


current_request_id = ContextVar("medicore_request_id", default="-")


def get_current_request_id():
    return current_request_id.get()
