from django.db.models.signals import post_save
from django_tenants.test.cases import TenantTestCase


class RecomputeRootComplianceTest(TenantTestCase):
    """An item the sync didn't re-fetch still gets its stale compliance corrected."""

    def setUp(self):
        from data.models import AIInsight, WorkItem
        from data.signals import ai_insight_telemetry_signal, work_item_telemetry_signal

        post_save.disconnect(work_item_telemetry_signal, sender=WorkItem)
        post_save.disconnect(ai_insight_telemetry_signal, sender=AIInsight)
        super().setUp()

    def test_stale_compliant_story_is_flagged_and_subtask_untouched(self):
        from django.utils import timezone
        from data.models import WorkItem
        from etl.connectors.clickup import ClickupConnector

        # Done story saved as compliant under an older rule, but AC/UT/PR/sign-off are empty.
        story = WorkItem.objects.create(external_id='S1', source_config_id=1, title='s', item_type='story', created_at=timezone.now(), updated_at=timezone.now(),
                                        status='done', status_category='done', dmt_compliant=True, compliance_failures=[])
        sub = WorkItem.objects.create(external_id='S1-a', source_config_id=1, title='qa', item_type='task', parent=story, created_at=timezone.now(), updated_at=timezone.now(),
                                      status='done', status_category='done', dmt_compliant=True, compliance_failures=[])

        epic = WorkItem.objects.create(external_id='E1', source_config_id=1, title='e', item_type='epic',
                                       status='done', status_category='done', created_at=timezone.now(), updated_at=timezone.now())
        # Story under an epic — the post-sync bulk-clear forces these compliant like a sub-task.
        epic_story = WorkItem.objects.create(external_id='S2', source_config_id=1, title='s2', item_type='story', parent=epic,
                                             status='done', status_category='done', dmt_compliant=True, compliance_failures=[],
                                             created_at=timezone.now(), updated_at=timezone.now())

        ClickupConnector({'api_key': 'x'})._recompute_root_compliance(1)

        story.refresh_from_db()
        sub.refresh_from_db()
        self.assertFalse(story.dmt_compliant)
        self.assertEqual(set(story.compliance_failures),
                         {'missing_ac_quality', 'missing_pr_link', 'unit_testing_not_done', 'missing_dmt_signoff'})
        self.assertTrue(story.had_violations)
        self.assertTrue(sub.dmt_compliant)
        epic_story.refresh_from_db()
        self.assertFalse(epic_story.dmt_compliant)
