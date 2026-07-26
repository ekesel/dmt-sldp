from rest_framework import serializers
from users.serializers import UserSerializer, SimpleUserSerializer
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

class CommentSerializer(serializers.ModelSerializer):
    """Comment Serializer with nested replies."""
    replies = serializers.SerializerMethodField()

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

    def get_replies(self, obj):
        replies = obj.replies.all().order_by('created_at')
        return CommentSerializer(replies, many=True).data

class ReactionSerializer(serializers.ModelSerializer):
    """Serializer for Post reactions."""
    username = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Reaction
        fields = ["reaction_id", "post", "user", "username", "avatar_url", "reaction_type", "created_at"]
        read_only_fields = ["user"]

    def get_username(self, obj):
        if not obj.user:
            return ""
        if obj.user.first_name or obj.user.last_name:
            return f"{obj.user.first_name} {obj.user.last_name}".strip()
        return obj.user.username

    def get_avatar_url(self, obj):
        if not obj.user:
            return None
        if obj.user.profile_picture:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.user.profile_picture.url)
            return obj.user.profile_picture.url
        
        import hashlib
        email = (obj.user.email or '').lower().encode('utf-8')
        email_hash = hashlib.md5(email).hexdigest()
        return f"https://www.gravatar.com/avatar/{email_hash}?d=identicon&s=200"