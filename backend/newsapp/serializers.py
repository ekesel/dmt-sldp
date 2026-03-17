from rest_framework import serializers
from users.serializers import UserSerializer
from .models import Post, Comment, Reaction

class PostSerializer(serializers.ModelSerializer):
    media_file = serializers.SerializerMethodField()
    author = UserSerializer(read_only=True)

    class Meta:
        model = Post
        fields = '__all__'

    def get_media_file(self, obj):
        """Returns the URL of the media file if it exists."""
        if obj.media_file:
            return obj.media_file.url
        return None

class ReplySerializer(serializers.ModelSerializer):
    """Simplified Comment Serializer for nested replies."""
    class Meta:
        model = Comment
        fields = ["comment_id", "user", "comment_text", "created_at"]

class CommentSerializer(serializers.ModelSerializer):
    """Comment Serializer with nested replies."""
    replies = ReplySerializer(many=True, read_only=True)

    class Meta:
        model = Comment
        fields = [
            "comment_id",
            "post",
            "user",
            "parent_comment",
            "comment_text",
            "created_at",
            "replies"
        ]
        read_only_fields = ["user"]

class ReactionSerializer(serializers.ModelSerializer):
    """Serializer for Post reactions."""
    class Meta:
        model = Reaction
        fields = ["reaction_id", "post", "user", "reaction_type", "created_at"]
        read_only_fields = ["user"]