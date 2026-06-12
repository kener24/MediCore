import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("auth", "0012_alter_user_first_name_max_length"),
        ("clinics", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Role",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("creado_en", models.DateTimeField(auto_now_add=True)),
                ("actualizado_en", models.DateTimeField(auto_now=True)),
                ("nombre", models.CharField(max_length=50, unique=True)),
                ("descripcion", models.TextField(blank=True)),
                ("activo", models.BooleanField(default=True)),
            ],
            options={"ordering": ["nombre"]},
        ),
        migrations.CreateModel(
            name="User",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("password", models.CharField(max_length=128, verbose_name="password")),
                ("last_login", models.DateTimeField(blank=True, null=True, verbose_name="last login")),
                ("is_superuser", models.BooleanField(default=False, help_text="Designates that this user has all permissions without explicitly assigning them.", verbose_name="superuser status")),
                ("creado_en", models.DateTimeField(auto_now_add=True)),
                ("actualizado_en", models.DateTimeField(auto_now=True)),
                ("nombre_completo", models.CharField(max_length=180)),
                ("email", models.EmailField(max_length=254, unique=True)),
                ("telefono", models.CharField(blank=True, max_length=30)),
                ("avatar_url", models.URLField(blank=True)),
                ("is_active", models.BooleanField(default=True)),
                ("is_staff", models.BooleanField(default=False)),
                ("ultimo_acceso", models.DateTimeField(blank=True, null=True)),
                ("date_joined", models.DateTimeField(default=django.utils.timezone.now)),
                ("clinica", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="usuarios", to="clinics.clinic")),
                ("groups", models.ManyToManyField(blank=True, help_text="The groups this user belongs to. A user will get all permissions granted to each of their groups.", related_name="user_set", related_query_name="user", to="auth.group", verbose_name="groups")),
                ("role", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="usuarios", to="accounts.role")),
                ("user_permissions", models.ManyToManyField(blank=True, help_text="Specific permissions for this user.", related_name="user_set", related_query_name="user", to="auth.permission", verbose_name="user permissions")),
            ],
            options={"ordering": ["nombre_completo"]},
        ),
    ]
