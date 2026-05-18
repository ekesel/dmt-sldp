from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('data', '0017_alter_pullrequest_external_id_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='workitem',
            name='assignee_contributions',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='workitem',
            name='violation_history',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='workitem',
            name='had_violations',
            field=models.BooleanField(db_index=True, default=False),
        ),
        migrations.AddField(
            model_name='workitem',
            name='violations_cleared_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='workitem',
            name='dmt_fields_source',
            field=models.CharField(
                blank=True,
                choices=[('self', 'Self'), ('subtask', 'Sub-task'), ('sub_subtask', 'Sub-sub-task')],
                max_length=20,
            ),
        ),
    ]
