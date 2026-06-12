from rest_framework import serializers


class ReportDateFiltersSerializer(serializers.Serializer):
    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)
    clinic = serializers.IntegerField(required=False)
    doctor = serializers.IntegerField(required=False)
    patient = serializers.IntegerField(required=False)
    status = serializers.CharField(required=False)

    def validate(self, attrs):
        date_from = attrs.get("date_from")
        date_to = attrs.get("date_to")
        if date_from and date_to and date_from > date_to:
            raise serializers.ValidationError("date_from no puede ser mayor que date_to.")
        return attrs


class GenericReportSerializer(serializers.Serializer):
    data = serializers.DictField(required=False)

