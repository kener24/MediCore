from apps.accounts.permissions import get_role_name


CLINICAL_ROLES = {"admin", "medico", "enfermera"}
UPLOAD_ROLES = {"admin", "medico", "enfermera", "recepcionista"}
MANAGE_ROLES = {"admin", "medico", "enfermera"}
ADMIN_DOC_TYPES = {"administrative", "identity", "consent", "billing", "other"}


def is_superadmin(user):
    return bool(user and user.is_authenticated and (user.is_superuser or get_role_name(user) == "superadmin"))


def can_list_documents(user):
    return get_role_name(user) in CLINICAL_ROLES | {"recepcionista"}


def can_upload_documents(user):
    return get_role_name(user) in UPLOAD_ROLES


def can_manage_document(user, document=None):
    role = get_role_name(user)
    if role in MANAGE_ROLES:
        return True
    if role == "recepcionista" and document:
        return document.document_type in ADMIN_DOC_TYPES and not document.is_sensitive
    return False


def can_access_document(user, document, for_download=False):
    role = get_role_name(user)
    if not user or not user.is_authenticated or document.status == "deleted" or not document.active:
        return False
    if is_superadmin(user):
        return False
    if role == "paciente":
        return document.patient.user_id == user.id and document.visible_to_patient and document.status == "active"
    if getattr(user, "clinica_id", None) != document.clinic_id:
        return False
    if role in {"admin", "medico", "enfermera"}:
        return True
    if role == "recepcionista":
        return document.document_type in ADMIN_DOC_TYPES and not document.is_sensitive
    return False


def can_upload_for_patient(user, patient, document_type=None, is_sensitive=False):
    role = get_role_name(user)
    if not can_upload_documents(user):
        return False
    if is_superadmin(user):
        return False
    if getattr(user, "clinica_id", None) != patient.clinic_id:
        return False
    if role == "recepcionista":
        return (document_type or "other") in ADMIN_DOC_TYPES and not is_sensitive
    return True
