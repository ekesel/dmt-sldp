from django_tenants.test.cases import TenantTestCase
from rest_framework.test import APIRequestFactory, force_authenticate
from notifications.models import Notification
from notifications.views import NotificationViewSet
from users.models import User

class QuickUpdateNotificationTest(TenantTestCase):
    def setUp(self):
        super().setUp()
        self.user = User.objects.create_user(
            username='testuser',
            password='password',
            email='test@example.com'
        )
        self.factory = APIRequestFactory()
        
        # Create 12 notifications to test pagination (page_size = 10)
        for i in range(12):
            Notification.objects.create(
                user=self.user,
                sender=self.user,
                tenant=self.tenant,
                title=f"Notification {i}",
                message=f"Message {i}",
                notification_type="qucik_update"
            )
        # Create a notification that should be filtered out
        Notification.objects.create(
            user=self.user,
            sender=self.user,
            tenant=self.tenant,
            title="Info Notification",
            message="This should be filtered out",
            notification_type="info"
        )

    def test_quick_update_endpoint_format_and_pagination(self):
        request = self.factory.get('/api/notifications/quick-update/')
        force_authenticate(request, user=self.user)
        response = NotificationViewSet.as_view({'get': 'quick_update'})(request)
        
        self.assertEqual(response.status_code, 200)
        res_data = response.data
        self.assertEqual(res_data.get('status_code'), 200)
        self.assertEqual(res_data.get('message'), 'success')
        
        pagination = res_data.get('pagination')
        self.assertIsNotNone(pagination)
        self.assertEqual(pagination.get('total_count'), 12)
        self.assertEqual(pagination.get('total_pages'), 2)
        self.assertEqual(pagination.get('current_page'), 1)
        self.assertEqual(pagination.get('page_size'), 10)
        
        data_list = res_data.get('data')
        self.assertEqual(len(data_list), 10) # page_size is 10
        
        # Check fields on the first item
        item = data_list[0]
        self.assertEqual(item.get('user_name'), 'testuser')
        self.assertIn('id', item)
        self.assertIn('title', item)
        self.assertIn('message', item)
        self.assertIn('notification_type', item)
        self.assertIn('is_read', item)
        self.assertIn('data', item)
        self.assertIn('created_at', item)

    def test_quick_update_pagination_next_page(self):
        request = self.factory.get('/api/notifications/quick-update/', {'page': 2})
        force_authenticate(request, user=self.user)
        response = NotificationViewSet.as_view({'get': 'quick_update'})(request)
        self.assertEqual(response.status_code, 200)
        
        res_data = response.data
        self.assertEqual(res_data.get('status_code'), 200)
        
        pagination = res_data.get('pagination')
        self.assertIsNotNone(pagination)
        self.assertEqual(pagination.get('total_count'), 12)
        self.assertEqual(pagination.get('total_pages'), 2)
        self.assertEqual(pagination.get('current_page'), 2)
        
        data_list = res_data.get('data')
        self.assertEqual(len(data_list), 2) # Remaining 2 items

    def test_user_name_fallback_hierarchy(self):
        # Create users with different profile structures
        user_with_name = User.objects.create_user(
            username='user_name_test',
            first_name='John',
            last_name='Doe',
            email='john@example.com'
        )
        user_with_username = User.objects.create_user(
            username='only_username',
            first_name='',
            last_name='',
            email='only_username@example.com'
        )
        user_with_email = User.objects.create_user(
            username='',
            first_name='',
            last_name='',
            email='email_only@example.com'
        )
        
        # Create notifications
        n1 = Notification.objects.create(
            user=self.user,
            sender=user_with_name,
            message="Test 1",
            notification_type="qucik_update"
        )
        n2 = Notification.objects.create(
            user=self.user,
            sender=user_with_username,
            message="Test 2",
            notification_type="qucik_update"
        )
        n3 = Notification.objects.create(
            user=self.user,
            sender=user_with_email,
            message="Test 3",
            notification_type="qucik_update"
        )
        n4 = Notification.objects.create(
            user=self.user,
            sender=None,
            message="Test 4",
            notification_type="qucik_update"
        )

        from notifications.serializers import QuickUpdateNotificationSerializer
        self.assertEqual(QuickUpdateNotificationSerializer(n1).data['user_name'], "John Doe")
        self.assertEqual(QuickUpdateNotificationSerializer(n2).data['user_name'], "only_username")
        self.assertEqual(QuickUpdateNotificationSerializer(n3).data['user_name'], "email_only@example.com")
        self.assertEqual(QuickUpdateNotificationSerializer(n4).data['user_name'], "")
