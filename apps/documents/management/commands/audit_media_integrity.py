import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from apps.documents.models import ClinicalDocument


class Command(BaseCommand):
    help = "Read-only integrity check for local clinical document references."

    def add_arguments(self, parser):
        parser.add_argument("--json", action="store_true")
        parser.add_argument("--media-root", default="")

    def handle(self, *args, **options):
        media_root = Path(options["media_root"] or settings.MEDIA_ROOT).resolve()
        referenced = set()
        missing = []
        unsafe = []

        documents = ClinicalDocument.objects.filter(
            storage_backend=ClinicalDocument.StorageBackend.LOCAL
        ).exclude(file="").only("id", "file")
        for document in documents.iterator(chunk_size=500):
            relative = Path(document.file.name)
            target = (media_root / relative).resolve()
            if media_root not in target.parents and target != media_root:
                unsafe.append(document.id)
                continue
            referenced.add(relative.as_posix())
            if not target.is_file():
                missing.append({"document_id": document.id, "file": relative.as_posix()})

        files = {
            path.relative_to(media_root).as_posix()
            for path in media_root.rglob("*")
            if path.is_file()
        } if media_root.exists() else set()
        orphans = files - referenced
        payload = {
            "status": "ok" if not missing and not unsafe and not orphans else "warning",
            "database_references": len(referenced),
            "files_on_disk": len(files),
            "missing_count": len(missing),
            "orphan_count": len(orphans),
            "unsafe_reference_count": len(unsafe),
            "missing": missing[:100],
            "orphan_files": sorted(orphans)[:100],
        }
        if options["json"]:
            self.stdout.write(json.dumps(payload, ensure_ascii=False, sort_keys=True))
        else:
            self.stdout.write(self.style.SUCCESS(json.dumps(payload, ensure_ascii=False, indent=2)))
        if unsafe:
            raise SystemExit(2)
