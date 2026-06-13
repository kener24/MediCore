from rest_framework import serializers

from apps.clinics.models import Clinic
from apps.core.validators import validate_digits_identifier, validate_phone


class ClinicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Clinic
        fields = [
            "id",
            "nombre",
            "rtn",
            "telefono",
            "correo",
            "direccion",
            "activo",
            "creado_en",
            "actualizado_en",
        ]
        read_only_fields = ["id", "creado_en", "actualizado_en"]

    def validate_rtn(self, value):
        return validate_digits_identifier(value, "El RTN", min_length=8, max_length=20)

    def validate_telefono(self, value):
        return validate_phone(value)
