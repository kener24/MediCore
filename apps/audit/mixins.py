from apps.audit.models import AuditLog
from apps.audit.services import create_audit_log, diff_dict, get_object_audit_data


class AuditModelViewSetMixin:
    audit_module = ""
    audit_object_type = ""
    audit_views = False

    def get_audit_module(self):
        if self.audit_module:
            return self.audit_module
        queryset = getattr(self, "queryset", None)
        model = getattr(queryset, "model", None)
        return getattr(getattr(model, "_meta", None), "app_label", AuditLog.Module.SYSTEM)

    def get_audit_object_type(self, obj=None):
        if self.audit_object_type:
            return self.audit_object_type
        if obj is not None:
            return obj.__class__.__name__
        queryset = getattr(self, "queryset", None)
        model = getattr(queryset, "model", None)
        return getattr(model, "__name__", "")

    def get_audit_description(self, action, obj=None):
        label = self.get_audit_object_type(obj) or "Objeto"
        return f"{label}: accion {action} registrada."

    def audit_log(self, action, obj=None, before_data=None, after_data=None, status=AuditLog.Status.SUCCESS, severity=AuditLog.Severity.INFO, description=""):
        before = before_data or {}
        after = after_data or (get_object_audit_data(obj) if obj is not None else {})
        return create_audit_log(
            request=getattr(self, "request", None),
            action=action,
            module=self.get_audit_module(),
            obj=obj,
            object_type=self.get_audit_object_type(obj),
            description=description or self.get_audit_description(action, obj),
            before_data=before,
            after_data=after,
            changes=diff_dict(before, after),
            status=status,
            severity=severity,
        )

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        if 200 <= response.status_code < 300:
            obj = None
            if isinstance(response.data, dict) and response.data.get("id"):
                obj = self.get_queryset().filter(pk=response.data["id"]).first()
            self.audit_log(AuditLog.Action.CREATE, obj=obj, after_data=response.data if isinstance(response.data, dict) else {})
        return response

    def update(self, request, *args, **kwargs):
        obj = self.get_object()
        before = get_object_audit_data(obj)
        response = super().update(request, *args, **kwargs)
        if 200 <= response.status_code < 300:
            obj.refresh_from_db()
            self.audit_log(AuditLog.Action.UPDATE, obj=obj, before_data=before, after_data=get_object_audit_data(obj))
        return response

    def partial_update(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        before = get_object_audit_data(obj)
        response = super().destroy(request, *args, **kwargs)
        if 200 <= response.status_code < 300:
            self.audit_log(AuditLog.Action.DELETE, obj=obj, before_data=before, after_data={})
        return response

    def retrieve(self, request, *args, **kwargs):
        response = super().retrieve(request, *args, **kwargs)
        if self.audit_views and 200 <= response.status_code < 300:
            obj = self.get_object()
            self.audit_log(AuditLog.Action.VIEW, obj=obj, after_data={"id": getattr(obj, "pk", "")})
        return response
