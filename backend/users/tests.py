from django.test import TestCase
from django.contrib.auth import get_user_model
from users.models import CustomPermission, RoleTable
from users.serializers import UserSerializer

User = get_user_model()

class UserPermissionSerializerTest(TestCase):
    def setUp(self):
        # Create some permissions
        self.perm1 = CustomPermission.objects.create(permission_code="UPLOAD_DOCUMENTS", name="Upload Documents")
        self.perm2 = CustomPermission.objects.create(permission_code="DELETE_DOCUMENTS", name="Delete Documents")
        
        # Create a role and assign permission 1
        self.role = RoleTable.objects.create(role_name="HR Manager", role_code="HR_MANAGER")
        self.role.permissions.add(self.perm1)
        
        # Create users
        self.regular_user = User.objects.create_user(
            username="regular",
            email="regular@example.com",
            password="password",
            role=self.role
        )
        self.superuser = User.objects.create_superuser(
            username="super",
            email="super@example.com",
            password="password"
        )
        self.no_role_user = User.objects.create_user(
            username="norole",
            email="norole@example.com",
            password="password"
        )

    def test_superuser_has_all_permissions(self):
        serializer = UserSerializer(self.superuser)
        permissions = serializer.data.get("permission")
        self.assertIsNotNone(permissions)
        self.assertEqual(len(permissions), 2)
        self.assertIn("UPLOAD_DOCUMENTS", permissions)
        self.assertIn("DELETE_DOCUMENTS", permissions)

    def test_regular_user_has_role_permissions(self):
        serializer = UserSerializer(self.regular_user)
        permissions = serializer.data.get("permission")
        self.assertIsNotNone(permissions)
        self.assertEqual(len(permissions), 1)
        self.assertEqual(permissions[0], "UPLOAD_DOCUMENTS")

    def test_user_without_role_has_no_permissions(self):
        serializer = UserSerializer(self.no_role_user)
        permissions = serializer.data.get("permission")
        self.assertIsNotNone(permissions)
        self.assertEqual(len(permissions), 0)
