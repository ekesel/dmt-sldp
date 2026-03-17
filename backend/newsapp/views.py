from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from .models import Post, Comment, Reaction
from .serializers import CommentSerializer, ReactionSerializer
from rest_framework.permissions import IsAuthenticated

# --- Comment Views ---

class CreateCommentView(APIView):
    permission_classes = [IsAuthenticated] # Allow any authenticated user to create comments
    """
    Create a root comment or a reply to an existing comment.
    Request data: {'post': ID, 'comment_text': '...', 'parent_comment': ID (optional)}
    """
    def post(self, request):
        try:
            serializer = CommentSerializer(data=request.data)
            if serializer.is_valid():
                # Setting the user manually from the request
                serializer.save(user=request.user)
                return Response({
                    "message": "Comment created successfully",
                    "data": serializer.data
                }, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PostCommentsView(APIView):
    permission_classes = [IsAuthenticated]
    """Retrieve all top-level comments for a specific post with nested replies."""
    def get(self, request, post_id):
        try:
            # Check if post exists
            get_object_or_404(Post, post_id=post_id)
            
            comments = Comment.objects.filter(post_id=post_id, parent_comment=None).order_by('-created_at')
            total_comments = comments.count()
            serializer = CommentSerializer(comments, many=True)
            return Response({"total_comments": total_comments, "comments": serializer.data}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UpdateCommentView(APIView):
    permission_classes = [IsAuthenticated]
    """Update a comment text. Only the author can update."""
    def put(self, request, comment_id):
        try:
            comment = get_object_or_404(Comment, comment_id=comment_id)
            
            # Permission check: Only the owner can update
            if comment.user != request.user:
                return Response({"error": "You do not have permission to edit this comment"}, status=status.HTTP_403_FORBIDDEN)

            serializer = CommentSerializer(comment, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DeleteCommentView(APIView):   
    permission_classes = [IsAuthenticated]
    """Delete a comment. Only the author or the post author can delete."""
    def delete(self, request, comment_id):
    
        try:
            comment = get_object_or_404(Comment, comment_id=comment_id)
         
            # Check permissions: Owner or Post Author
            if comment.user != request.user and comment.post.author != request.user:
                return Response({"error": "You do not have permission to delete this comment"}, status=status.HTTP_403_FORBIDDEN)

            comment.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# --- Reaction Views ---

class ReactPostView(APIView):
    permission_classes = [IsAuthenticated]
    """Add or Update a reaction to a post."""
    def post(self, request):
        try:
            post_id = request.data.get("post")
            reaction_type = request.data.get("reaction_type")

            if not post_id or not reaction_type:
                return Response({"error": "post id and reaction_type are required"}, status=status.HTTP_400_BAD_REQUEST)

            # Check if post exists
            get_object_or_404(Post, post_id=post_id)

            # update_or_create handles the logic of preventing double likes
            reaction, created = Reaction.objects.update_or_create(
                post_id=post_id,
                user=request.user,
                defaults={"reaction_type": reaction_type}
            )

            serializer = ReactionSerializer(reaction)
            return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PostReactionsView(APIView):
    permission_classes = [IsAuthenticated] 
    """Get all reactions for a post via path parameters."""
    def get(self, request, post_id):
        try:
            reactions = Reaction.objects.filter(post_id=post_id)
            total_reactions = reactions.count()
            serializer = ReactionSerializer(reactions, many=True)
            return Response({"total_reactions": total_reactions, "reactions": serializer.data}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DeleteReactionView(APIView):
    permission_classes = [IsAuthenticated]
    """Remove a user's reaction from a post."""
    def delete(self, request, post_id):
        try:
            reaction = Reaction.objects.filter(post_id=post_id, user=request.user).first()
            
            if not reaction:
                return Response({"error": "Reaction not found"}, status=status.HTTP_404_NOT_FOUND)

            reaction.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)