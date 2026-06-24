import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q

from knowledge_base.models import Document
from homepage.models import Policy, LearningAndDevelopment, Onboarding
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
            if not (1 <= limit <= 100):
                return Response({"error": "Limit must be between 1 and 100"}, status=400)
        except ValueError:
            return Response({"error": "Limit must be a valid integer"}, status=400)

        doc_id = request.query_params.get('id')
        doc_type = request.query_params.get('type')

        if doc_id:
            try:
                doc_id = int(doc_id)
            except ValueError:
                return Response({"error": "id must be a valid integer"}, status=400)

            if not doc_type or doc_type == 'knowledge_base':
                doc = get_visible_docs(request.user).filter(id=doc_id).first()
                if doc:
                    latest_version = doc.versions.order_by("-version_number").first()
                    file_url = latest_version.file.url if (latest_version and latest_version.file) else None
                    return Response({
                        "type": "knowledge_base",
                        "id": doc.id,
                        "title": doc.title,
                        "file": file_url
                    })
            if not doc_type or doc_type == 'policy_document':
                policy = Policy.objects.filter(org_name=request.tenant.name, id=doc_id).first()
                if policy:
                    file_url = policy.policy_file.url if policy.policy_file else None
                    return Response({
                        "type": "policy_document",
                        "id": policy.id,
                        "title": policy.policy_file.name.split('/')[-1] if policy.policy_file else "",
                        "file": file_url
                    })
            if not doc_type or doc_type == 'learning_and_development':
                ld = LearningAndDevelopment.objects.filter(org_name=request.tenant.name, id=doc_id).first()
                if ld:
                    file_url = ld.learning_and_development_file.url if ld.learning_and_development_file else None
                    return Response({
                        "type": "learning_and_development",
                        "id": ld.id,
                        "title": ld.learning_and_development_file.name.split('/')[-1] if ld.learning_and_development_file else "",
                        "file": file_url
                    })
            if not doc_type or doc_type == 'onboarding':
                onb = Onboarding.objects.filter(org_name=request.tenant.name, id=doc_id).first()
                if onb:
                    file_url = onb.onboarding_file.url if onb.onboarding_file else None
                    return Response({
                        "type": "onboarding",
                        "id": onb.id,
                        "title": onb.title or (onb.onboarding_file.name.split('/')[-1] if onb.onboarding_file else ""),
                        "file": file_url
                    })
                    
            return Response({"error": "Document not found"}, status=404)

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

        # Learning and Development search
        ld_docs = LearningAndDevelopment.objects.filter(
            org_name=request.tenant.name,
            learning_and_development_file__icontains=query
        ).distinct()[:limit]

        # Onboarding search
        onb_docs = Onboarding.objects.filter(
            Q(org_name=request.tenant.name) &
            (Q(title__icontains=query) | Q(onboarding_file__icontains=query))
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
                "type": "policy_document",
                "id": policy.id,
                "title": policy.policy_file.name.split('/')[-1] if policy.policy_file else "",
                "file": file_url
            })

        for ld in ld_docs:
            file_url = ld.learning_and_development_file.url if ld.learning_and_development_file else None
            results.append({
                "type": "learning_and_development",
                "id": ld.id,
                "title": ld.learning_and_development_file.name.split('/')[-1] if ld.learning_and_development_file else "",
                "file": file_url
            })

        for onb in onb_docs:
            file_url = onb.onboarding_file.url if onb.onboarding_file else None
            results.append({
                "type": "onboarding",
                "id": onb.id,
                "title": onb.title or (onb.onboarding_file.name.split('/')[-1] if onb.onboarding_file else ""),
                "file": file_url
            })

        # Sort the unified list by title alphabetically
        results = sorted(results, key=lambda x: x["title"].lower())
        
        final_results = results[:limit]

        return Response({
            "count": len(final_results),
            "results": final_results
        })
