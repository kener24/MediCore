def normalized_prefix(value, default):
    raw = (value or default or "").strip().upper()
    if not raw:
        raw = default
    return raw if raw.endswith("-") else f"{raw}-"


def clinic_setting(clinic, field_name, default=None):
    if not clinic:
        return default
    try:
        settings = clinic.settings
    except AttributeError:
        from apps.clinic_settings.models import get_or_create_clinic_settings

        settings = get_or_create_clinic_settings(clinic)
    return getattr(settings, field_name, default) if settings else default


def clinic_prefix(clinic, field_name, default):
    return normalized_prefix(clinic_setting(clinic, field_name, default), default)


def next_sequence_number(model_class, clinic, number_field, prefix, width=6):
    last = model_class.objects.filter(
        clinic=clinic,
        **{f"{number_field}__startswith": prefix},
    ).order_by("-id").first()
    next_value = 1
    if last:
        current = getattr(last, number_field, "")
        try:
            next_value = int(current.replace(prefix, "", 1)) + 1
        except (TypeError, ValueError):
            next_value = last.id + 1
    return f"{prefix}{next_value:0{width}d}"
