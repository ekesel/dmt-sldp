import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q

from knowledge_base.models import Document
from homepage.models import Policy
from knowledge_base.serializers import DocumentSerializer
from homepage.serializers import PolicySerializer
from knowledge_base.utils import get_visible_docs

logger = logging.getLogger(__name__)

class GlobalSearchAPIView(APIView):
    """
    Unified global search API.
    Currently searches Knowledge Base (Documents) and Policy Docs.
    Supports limit and pagination.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        
        try:
            limit = int(request.query_params.get('limit', 10))
        except ValueError:
            limit = 10

        doc_id = request.query_params.get('id')
        doc_type = request.query_params.get('type')

        if doc_id:
            results = []
            if not doc_type or doc_type == 'knowledge_base':
                doc = get_visible_docs(request.user).filter(id=doc_id).first()
                if doc:
                    latest_version = doc.versions.order_by("-version_number").first()
                    file_url = latest_version.file.url if (latest_version and latest_version.file) else None
                    results.append({
                        "type": "knowledge_base",
                        "id": doc.id,
                        "title": doc.title,
                        "file": file_url
                    })
            if not doc_type or doc_type == 'policy_doc':
                policy = Policy.objects.filter(org_name=request.tenant.name, id=doc_id).first()
                if policy:
                    file_url = policy.policy_file.url if policy.policy_file else None
                    results.append({
                        "type": "policy_doc",
                        "id": policy.id,
                        "title": policy.policy_file.name.split('/')[-1] if policy.policy_file else "",
                        "file": file_url
                    })
                    
            return Response({
                "count": len(results),
                "results": results
            })

        if not query:
            return Response({
                "count": 0,
                "results": []
            })

        # Knowledge Base search
        kb_docs = get_visible_docs(request.user).filter(
            title__icontains=query
        ).distinct()[:limit]

        # Policy Doc search
        # Filter by org_name matching the tenant
        policy_docs = Policy.objects.filter(
            org_name=request.tenant.name,
            policy_file__icontains=query
        ).distinct()[:limit]

        # Unify results
        results = []

        for doc in kb_docs:
            latest_version = doc.versions.order_by("-version_number").first()
            file_url = latest_version.file.url if (latest_version and latest_version.file) else None
            results.append({
                "type": "knowledge_base",
                "id": doc.id,
                "title": doc.title,
                "file": file_url
            })
            
        for policy in policy_docs:
            file_url = policy.policy_file.url if policy.policy_file else None
            results.append({
                "type": "policy_doc",
                "id": policy.id,
                "title": policy.policy_file.name.split('/')[-1] if policy.policy_file else "",
                "file": file_url
            })

        # Sort the unified list by title alphabetically
        results = sorted(results, key=lambda x: x["title"].lower())
        
        final_results = results[:limit]

        return Response({
            "count": len(final_results),
            "results": final_results
        })
