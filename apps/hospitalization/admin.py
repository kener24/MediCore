from django.contrib import admin

from apps.hospitalization.models import HospitalBed, HospitalBedAssignment, HospitalRoom, HospitalVitalSigns, Hospitalization, HospitalizationEvent, MedicalEvolution, MedicalInstruction, MedicationAdministration, NursingNote, NursingRound, TreatmentPlan


admin.site.register(HospitalRoom)
admin.site.register(HospitalBed)
admin.site.register(Hospitalization)
admin.site.register(HospitalBedAssignment)
admin.site.register(HospitalVitalSigns)
admin.site.register(NursingNote)
admin.site.register(HospitalizationEvent)
admin.site.register(NursingRound)
admin.site.register(MedicationAdministration)
admin.site.register(MedicalEvolution)
admin.site.register(TreatmentPlan)
admin.site.register(MedicalInstruction)
