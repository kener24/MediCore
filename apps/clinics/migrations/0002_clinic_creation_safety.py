from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("clinics", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="clinic",
            name="creation_fingerprint",
            field=models.CharField(blank=True, editable=False, max_length=64, null=True, unique=True),
        ),
        migrations.AddField(
            model_name="clinic",
            name="creation_idempotency_key",
            field=models.CharField(blank=True, editable=False, max_length=100, null=True, unique=True),
        ),
    ]
