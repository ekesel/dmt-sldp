# Generated manually

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('configuration', '0005_add_current_task_id'),
    ]

    operations = [
        migrations.CreateModel(
            name='CompanyBaseline',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('last_updated', models.DateTimeField(auto_now=True)),
                ('velocity', models.FloatField(default=400.0)),
                ('compliance_rate', models.FloatField(default=80.0)),
                ('cycle_time', models.FloatField(default=4.0)),
                ('defect_density', models.FloatField(default=5.0)),
                ('pr_review_speed', models.FloatField(default=24.0)),
                ('ai_usage', models.FloatField(default=30.0)),
                ('item_volume_total', models.IntegerField(default=20)),
                ('item_volume_completed', models.IntegerField(default=16)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='company_baselines', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'company_baselines',
            },
        ),
    ]
