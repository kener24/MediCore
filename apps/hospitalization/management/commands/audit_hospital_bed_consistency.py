import json

from django.core.management.base import BaseCommand, CommandError
from django.db.models import Count, F, Q

from apps.hospitalization.models import HospitalBed, HospitalBedAssignment, Hospitalization


class Command(BaseCommand):
    help = "Diagnostica inconsistencias de ocupacion hospitalaria sin modificar datos."

    def add_arguments(self, parser):
        parser.add_argument("--clinic", type=int, help="Limita el diagnostico a una clinica.")
        parser.add_argument("--json", action="store_true", dest="as_json")
        parser.add_argument("--fail-on-errors", action="store_true")

    def handle(self, *args, **options):
        clinic_id = options.get("clinic")
        beds = HospitalBed.objects.all()
        assignments = HospitalBedAssignment.objects.select_related("bed", "hospitalization")
        hospitalizations = Hospitalization.objects.all()
        if clinic_id:
            beds = beds.filter(clinic_id=clinic_id)
            assignments = assignments.filter(bed__clinic_id=clinic_id)
            hospitalizations = hospitalizations.filter(clinic_id=clinic_id)

        active_assignments = assignments.filter(released_at__isnull=True)
        errors = []
        warnings = []

        for bed in beds.filter(status=HospitalBed.Status.OCCUPIED):
            if not active_assignments.filter(bed=bed).exists():
                errors.append({"code": "occupied_without_assignment", "bed": bed.id, "clinic": bed.clinic_id})
        for assignment in active_assignments.exclude(bed__status=HospitalBed.Status.OCCUPIED):
            errors.append({"code": "assignment_bed_not_occupied", "assignment": assignment.id, "bed": assignment.bed_id})
        for assignment in active_assignments.exclude(bed__clinic_id=F("hospitalization__clinic_id")):
            errors.append({"code": "assignment_clinic_mismatch", "assignment": assignment.id})
        for row in active_assignments.values("bed_id").annotate(total=Count("id")).filter(total__gt=1):
            errors.append({"code": "multiple_assignments_per_bed", **row})
        for row in active_assignments.values("hospitalization_id").annotate(total=Count("id")).filter(total__gt=1):
            errors.append({"code": "multiple_beds_per_hospitalization", **row})

        open_hospitalizations = hospitalizations.filter(status__in=Hospitalization.OPEN_STATUSES)
        for hospitalization in open_hospitalizations.filter(current_bed__isnull=False):
            if not active_assignments.filter(hospitalization=hospitalization, bed_id=hospitalization.current_bed_id).exists():
                errors.append({"code": "hospitalization_bed_without_assignment", "hospitalization": hospitalization.id, "bed": hospitalization.current_bed_id})
        for hospitalization in open_hospitalizations.filter(current_bed__isnull=True).exclude(status=Hospitalization.Status.PENDING_ADMISSION):
            warnings.append({"code": "active_hospitalization_without_bed", "hospitalization": hospitalization.id, "clinic": hospitalization.clinic_id})
        for assignment in active_assignments.filter(~Q(hospitalization__current_bed_id=F("bed_id"))):
            errors.append({"code": "assignment_not_current_bed", "assignment": assignment.id, "hospitalization": assignment.hospitalization_id})

        result = {
            "clinic": clinic_id,
            "checked": {
                "beds": beds.count(),
                "assignments": assignments.count(),
                "active_assignments": active_assignments.count(),
                "hospitalizations": hospitalizations.count(),
            },
            "errors": errors,
            "warnings": warnings,
            "consistent": not errors,
        }
        if options["as_json"]:
            self.stdout.write(json.dumps(result, ensure_ascii=False, indent=2, default=str))
        else:
            self.stdout.write(f"Hospitalizacion revisada: {result['checked']}")
            self.stdout.write(f"Errores: {len(errors)} | Advertencias: {len(warnings)}")
            for issue in errors:
                self.stdout.write(self.style.ERROR(json.dumps(issue, ensure_ascii=False)))
            for issue in warnings:
                self.stdout.write(self.style.WARNING(json.dumps(issue, ensure_ascii=False)))
            if not errors:
                self.stdout.write(self.style.SUCCESS("No se encontraron inconsistencias criticas."))
        if errors and options["fail_on_errors"]:
            raise CommandError(f"Se encontraron {len(errors)} inconsistencias criticas.")
