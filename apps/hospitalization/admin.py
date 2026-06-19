from django.contrib import admin

from apps.hospitalization.models import HospitalBed, HospitalBedAssignment, HospitalRoom, HospitalVitalSigns, Hospitalization, HospitalizationEvent, NursingNote


admin.site.register(HospitalRoom)
admin.site.register(HospitalBed)
admin.site.register(Hospitalization)
admin.site.register(HospitalBedAssignment)
admin.site.register(HospitalVitalSigns)
admin.site.register(NursingNote)
admin.site.register(HospitalizationEvent)
