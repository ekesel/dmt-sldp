from django.db import models
from users.models import User
import uuid


def get_post_media_upload_path(instance, filename):
    # Retrieve tenant and user IDs to organize the uploaded files
    # E.g., 'media/tenants/<tenant_id>/users/<user_id>/posts/<filename>'
    tenant_id = instance.author.tenant.id if instance.author and instance.author.tenant else 'unknown_tenant'
    user_id = instance.author.id if instance.author else 'unknown_user'
    
    return f'tenants/{tenant_id}/users/{user_id}/posts/{filename}'

"""post model"""
class Post(models.Model):
    post_id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=255)
    content = models.TextField()
    media_file = models.FileField(upload_to=get_post_media_upload_path, blank=True, null=True)
    category = models.CharField(max_length=100) # news, events, promotions, announcement, etc
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='posts')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


    class Meta:
        verbose_name = "Post"

    def __str__(self):
        return f"{self.title} - {self.author.username}"



"""comment model"""
class Comment(models.Model):
    comment_id = models.AutoField(primary_key=True)
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='comments')
    parent_comment = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')
    comment_text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Comment"

    def __str__(self):
        return f"Comment by {self.user.username} on {self.post.title}"



"""reaction model"""
class Reaction(models.Model):
    REACTION_CHOICES = [
        ('like', 'Like'),
        ('love', 'Love'),
        ('haha', 'Haha'),
        ('sad', 'Sad'),
    ]


    reaction_id = models.AutoField(primary_key=True)
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='reactions')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reactions')
    reaction_type = models.CharField(max_length=50, choices=REACTION_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Reaction"
        unique_together = ("user", "post")

    def __str__(self):
        return f"{self.reaction_type} by {self.user.username} on {self.post.title}"






# Temp IMG model -

class Image(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    file = models.FileField(upload_to="PostImages/")
    is_used = models.BooleanField(default=False) #just to make sure that the temp image is not used more than once, we can set this flag to true after using it for a post and delete the temp image after saving the post.
    created_at = models.DateTimeField(auto_now_add=True)
    