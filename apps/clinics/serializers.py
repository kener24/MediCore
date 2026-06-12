from rest_framework import serializers

from apps.clinics.models import Clinic


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

