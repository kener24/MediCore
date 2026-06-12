from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Clinic",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("creado_en", models.DateTimeField(auto_now_add=True)),
                ("actualizado_en", models.DateTimeField(auto_now=True)),
                ("nombre", models.CharField(max_length=180)),
                ("rtn", models.CharField(blank=True, max_length=50)),
                ("telefono", models.CharField(blank=True, max_length=30)),
                ("correo", models.EmailField(blank=True, max_length=254)),
                ("direccion", models.TextField(blank=True)),
                ("activo", models.BooleanField(default=True)),
            ],
            options={"ordering": ["nombre"]},
        ),
    ]

