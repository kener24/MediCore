import hashlib
import os
import uuid

from django.conf import settings
from django.utils.text import slugify


DANGEROUS_EXTENSIONS = {"exe", "bat", "cmd", "js", "php", "sh", "msi", "dll", "com", "scr", "ps1", "vbs"}


def allowed_extensions():
    configured = getattr(settings, "DOCUMENT_ALLOWED_EXTENSIONS", "pdf,jpg,jpeg,png,webp,doc,docx,xls,xlsx")
    if isinstance(configured, str):
        return {item.strip().lower().lstrip(".") for item in configured.split(",") if item.strip()}
    return {str(item).strip().lower().lstrip(".") for item in configured}


def max_upload_size_bytes():
    return int(getattr(settings, "DOCUMENT_MAX_UPLOAD_SIZE_MB", 10)) * 1024 * 1024


def file_extension(filename):
    return os.path.splitext(filename or "")[1].lower().lstrip(".")


def safe_document_filename(filename):
    name, ext = os.path.splitext(os.path.basename(filename or "documento"))
    safe_name = slugify(name)[:80] or "documento"
    safe_ext = ext.lower().replace("/", "").replace("\\", "")
    return f"{safe_name}-{uuid.uuid4().hex[:12]}{safe_ext}"


def clinical_document_upload_to(instance, filename):
    return "clinics/{clinic}/patients/{patient}/documents/{filename}".format(
        clinic=instance.clinic_id or "pending",
        patient=instance.patient_id or "pending",
        filename=safe_document_filename(filename),
    )


def calculate_checksum(file_obj):
    sha = hashlib.sha256()
    position = file_obj.tell() if hasattr(file_obj, "tell") else None
    if hasattr(file_obj, "seek"):
        file_obj.seek(0)
    for chunk in iter(lambda: file_obj.read(1024 * 1024), b""):
        sha.update(chunk)
    if position is not None and hasattr(file_obj, "seek"):
        file_obj.seek(position)
    return sha.hexdigest()


def validate_document_file(uploaded_file):
    ext = file_extension(uploaded_file.name)
    if ext in DANGEROUS_EXTENSIONS or ext not in allowed_extensions():
        raise ValueError("Tipo de archivo no permitido.")
    if uploaded_file.size > max_upload_size_bytes():
        raise ValueError("El archivo excede el tamano maximo permitido.")
    return ext
