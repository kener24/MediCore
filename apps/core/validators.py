import re

from rest_framework import serializers


PHONE_RE = re.compile(r"^[0-9+()\-\s]{7,30}$")
DIGITS_RE = re.compile(r"^\d+$")


def normalize_digits(value):
    if value in (None, ""):
        return ""
    return re.sub(r"[\s-]+", "", str(value).strip())


def validate_digits_identifier(value, field_name="identificacion", min_length=6, max_length=20):
    value = normalize_digits(value)
    if not value:
        return ""
    if not DIGITS_RE.fullmatch(value):
        raise serializers.ValidationError(f"{field_name} solo debe contener numeros.")
    if len(value) < min_length or len(value) > max_length:
        raise serializers.ValidationError(f"{field_name} debe tener entre {min_length} y {max_length} digitos.")
    return value


def validate_phone(value):
    if value in (None, ""):
        return ""
    value = str(value).strip()
    if not PHONE_RE.fullmatch(value):
        raise serializers.ValidationError("El telefono solo puede contener numeros, espacios, +, guiones y parentesis.")
    digits = re.sub(r"\D", "", value)
    if len(digits) < 7 or len(digits) > 15:
        raise serializers.ValidationError("El telefono debe tener entre 7 y 15 digitos.")
    return value
