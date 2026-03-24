from __future__ import annotations

from rest_framework import viewsets, permissions, status, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Q
from .models import UserIdentityMapping, WorkItem, PullRequest, Commit
from .tasks import backfill_identity_merge
from django_tenants.utils import schema_context
import logging

logger = logging.getLogger(__name__)

class UserIdentityMappingSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserIdentityMapping
        fields = '__all__'

class UserIdentityMappingViewSet(viewsets.ModelViewSet):
    queryset = UserIdentityMapping.objects.all().order_by('-updated_at')
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserIdentityMappingSerializer
    
    def _get_tenant(self, request):
        from tenants.models import Tenant
        tenant_id = request.headers.get('X-Tenant')
        print(f"DEBUG: Identity ViewSet - Received X-Tenant header: {tenant_id}")
        
        if not tenant_id:
            # Try lowercase just in case
            tenant_id = request.headers.get('x-tenant')
            if not tenant_id:
                # Try from META
                tenant_id = request.META.get('HTTP_X_TENANT')
                print(f"DEBUG: Checking META HTTP_X_TENANT: {tenant_id}")
        
        if not tenant_id:
            print("DEBUG: No tenant ID found in headers")
            return None
        
        try:
            if str(tenant_id).isdigit():
                t = Tenant.objects.get(id=tenant_id)
            else:
                t = Tenant.objects.get(Q(slug=tenant_id) | Q(schema_name=tenant_id))
            print(f"DEBUG: Resolved tenant: {t.name} (Schema: {t.schema_name})")
            return t
        except (Tenant.DoesNotExist, ValueError) as e:
            print(f"DEBUG: Tenant lookup failed for {tenant_id}: {e}")
            return None

    def create(self, request, *args, **kwargs):
        tenant = self._get_tenant(request)
        if not tenant: return super().create(request, *args, **kwargs)
        with schema_context(tenant.schema_name):
            return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        tenant = self._get_tenant(request)
        if not tenant: return super().update(request, *args, **kwargs)
        with schema_context(tenant.schema_name):
            return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        tenant = self._get_tenant(request)
        if not tenant: return super().destroy(request, *args, **kwargs)
        with schema_context(tenant.schema_name):
            return super().destroy(request, *args, **kwargs)

    def list(self, request, *args, **kwargs):
        tenant = self._get_tenant(request)
        if not tenant: return super().list(request, *args, **kwargs)
        with schema_context(tenant.schema_name):
            return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        tenant = self._get_tenant(request)
        if not tenant: return super().retrieve(request, *args, **kwargs)
        with schema_context(tenant.schema_name):
            return super().retrieve(request, *args, **kwargs)

    def perform_create(self, serializer):
        instance = serializer.save()
        from django.db import connection
        if connection.schema_name != 'public':
            backfill_identity_merge.delay(instance.id, schema_name=connection.schema_name)

    def perform_update(self, serializer):
        instance = serializer.save()
        from django.db import connection
        if connection.schema_name != 'public':
            backfill_identity_merge.delay(instance.id, schema_name=connection.schema_name)

    @action(detail=False, methods=['get'])
    def suggestions(self, request):
        """
        Detects potential identity fragments by finding different emails with similar names.
        """
        print("DEBUG: Suggestions endpoint reached")
        tenant = self._get_tenant(request)
        if not tenant:
            return Response([])

        with schema_context(tenant.schema_name):
            # 1. Get pairs from WorkItems
            wi_pairs = list(WorkItem.objects.filter(
                assignee_email__isnull=False
            ).values('assignee_email', 'assignee_name').distinct())

            # 2. Get pairs from PRs — must be inside schema_context
            pr_pairs = list(PullRequest.objects.values('author_email', 'author_name').distinct())

            # 3. Existing mappings — must be inside schema_context
            merged_emails = {m.canonical_email.lower() for m in UserIdentityMapping.objects.all()}
            for m in UserIdentityMapping.objects.all():
                for ident in m.source_identities:
                    if ident.get('email'):
                        merged_emails.add(ident['email'].lower())

            # Combine into name -> set(emails)
            identities: dict = {}
            email_to_name: dict = {}

            for p in wi_pairs:
                email = (p['assignee_email'] or '').lower().strip()
                name = (p['assignee_name'] or '').strip()
                if not email or not name:
                    continue
                email_to_name[email] = name
                name_key = name.lower()
                identities.setdefault(name_key, set()).add(email)

            for p in pr_pairs:
                email = (p['author_email'] or '').lower().strip()
                name = (p['author_name'] or '').strip()
                if not email or not name:
                    continue
                email_to_name[email] = name
                name_key = name.lower()
                identities.setdefault(name_key, set()).add(email)

            suggestions = []
            for name_key, emails in identities.items():
                if len(emails) <= 1:
                    continue
                unmerged_emails = [e for e in emails if e not in merged_emails]
                if unmerged_emails:
                    suggestions.append({
                        'name': email_to_name[next(iter(emails))],
                        'emails': list(emails)
                    })

            print(f"DEBUG: Suggestions found: {len(suggestions)}")
        return Response(suggestions)

    @action(detail=False, methods=['get'])
    def search(self, request):
        """
        Finds all unique email/name pairs for manual identity mapping.
        An empty query (q='') returns all available identities for the tenant.
        """
        print(f"DEBUG: Search endpoint reached with query: {request.query_params.get('q', '')}")
        query = request.query_params.get('q', '').lower().strip()

        tenant = self._get_tenant(request)
        if not tenant:
            return Response([])

        # Collect unique identities from all models
        results = {} # email -> name

        # 1. Platform Users (from public schema)
        from users.models import User as PortalUser
        user_qs = PortalUser.objects.filter(is_active=True)
        if query:
            user_qs = user_qs.filter(Q(email__icontains=query) | Q(username__icontains=query) | Q(first_name__icontains=query) | Q(last_name__icontains=query))
        
        for u in user_qs[:50]:
            name = f"{u.first_name} {u.last_name}".strip() or u.username
            results[u.email.lower()] = name

        with schema_context(tenant.schema_name):
            # 2. Existing Mappings
            mapping_qs = UserIdentityMapping.objects.all()
            if query:
                mapping_qs = mapping_qs.filter(Q(canonical_email__icontains=query) | Q(canonical_name__icontains=query))
            
            for m in mapping_qs[:50]:
                results[m.canonical_email.lower()] = m.canonical_name

            # 3. WorkItems (Unmapped fragments)
            wi_qs = WorkItem.objects.filter(assignee_email__isnull=False)
            if query:
                wi_qs = wi_qs.filter(Q(assignee_email__icontains=query) | Q(assignee_name__icontains=query))
            
            for item in wi_qs.values('assignee_email', 'assignee_name').distinct()[:50]:
                email = item['assignee_email'].lower()
                if email not in results:
                    results[email] = item['assignee_name'] or email

            # 4. PRs (Unmapped fragments)
            pr_qs = PullRequest.objects.filter(author_email__isnull=False)
            if query:
                pr_qs = pr_qs.filter(Q(author_email__icontains=query) | Q(author_name__icontains=query))

            for item in pr_qs.values('author_email', 'author_name').distinct()[:50]:
                email = item['author_email'].lower()
                if email not in results:
                    results[email] = item['author_name'] or email

            # Format for frontend
            formatted = [{'email': e, 'name': n} for e, n in results.items()]
            print(f"DEBUG: Search format results: {len(formatted)}")
            return Response(formatted[:100])
