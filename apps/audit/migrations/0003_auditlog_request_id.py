from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("audit", "0002_auditlog_after_data_auditlog_before_data_and_more")]

    operations = [
        migrations.AddField(
            model_name="auditlog",
            name="request_id",
            field=models.UUIDField(blank=True, db_index=True, editable=False, null=True),
        ),
    ]
