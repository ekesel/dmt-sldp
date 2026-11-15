from django.db import migrations, models


def backfill(apps, schema_editor):
    """Membership = the item's own sprint + every ClickUp sprint list in its raw list/locations."""
    WorkItem = apps.get_model('data', 'WorkItem')
    Sprint = apps.get_model('data', 'Sprint')
    Through = WorkItem.sprints.through
    by_list = {(s.source_config_id, s.external_id.replace('clickup_sprint_', '')): s.id
               for s in Sprint.objects.filter(external_id__startswith='clickup_sprint_')}
    rows = set()
    for wid, sid, src, lst, locs in WorkItem.objects.values_list(
            'id', 'sprint_id', 'source_config_id', 'raw_source_data__list__id', 'raw_source_data__locations').iterator():
        if sid:
            rows.add((wid, sid))
        for list_id in {lst} | {l.get('id') for l in (locs or []) if isinstance(l, dict)}:
            if (src, list_id) in by_list:
                rows.add((wid, by_list[(src, list_id)]))
    Through.objects.bulk_create([Through(workitem_id=w, sprint_id=s) for w, s in rows], batch_size=5000, ignore_conflicts=True)


class Migration(migrations.Migration):

    dependencies = [
        ('data', '0020_sprint_source_config_id_alter_sprint_external_id_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='workitem',
            name='sprints',
            field=models.ManyToManyField(blank=True, related_name='member_items', to='data.sprint'),
        ),
        migrations.RunPython(backfill, migrations.RunPython.noop),
    ]
