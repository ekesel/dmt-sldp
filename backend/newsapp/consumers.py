from channels.generic.websocket import AsyncJsonWebsocketConsumer
from asgiref.sync import sync_to_async
from django_tenants.utils import schema_context
from tenants.models import Domain
from .models import Post, Image
from .serializers import PostSerializer
from users.models import User
import json 
import logging
from django.core.paginator import Paginator
from django.utils.timezone import localtime
from datetime import datetime

logger = logging.getLogger(__name__)


class NewsConsumer(AsyncJsonWebsocketConsumer):

    #  Helper to get schema name from Websocket connection
    @sync_to_async
    def get_schema_name(self):
        # convert headers to dict for easier access becouse Django Channels scope conatin some value like header ,path ,client ip ...
        headers = dict(self.scope.get('headers', []))
        # finding host header and extract domain name (without port) to find the corresponding tenant
        host = headers.get(b'host', b'').decode('utf-8').split(':')[0]
        try:
            # find the tenant schema name based on the host header, if not found return "public" as default schema name
            return Domain.objects.get(domain=host).tenant.schema_name
        except Domain.DoesNotExist:
            return "public"


    #  Connection Setup
    async def connect(self):

        self.user = self.scope["user"]
        if not self.user.is_authenticated:
            await self.close()
            return

        # Here store the  tenanat schema_name to the schema_
        self.schema_name = await self.get_schema_name()
        self.group_name = f"news_{self.schema_name}"
        
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        
        await self.send_json({"status": "news app websocket is connected", "group": self.group_name})

    def is_manager(self):
        return self.user.is_manager
    
    def format_dates(self, data):
        if isinstance(data, list):
            for item in data:
                self._format_item(item)
        elif isinstance(data, dict):
            self._format_item(data)
        return data

    def _format_item(self, item):
        for field in ['created_at', 'updated_at']:
            if field in item and item[field]:
                try:
                    dt = datetime.fromisoformat(item[field].replace('Z', '+00:00'))
                    item[field] = localtime(dt).strftime('%Y-%m-%d %H:%M:%S')
                except:
                    pass
    



    # this method handles when user disconnect from websocket and remove it from the group
    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)


    #  Handle Incoming action from client side like post creation , update , delete and get posts
    async def receive(self, text_data):
        # Guard: ignore empty frames (e.g. client pings / heartbeats)
        if not text_data or not text_data.strip():
            return

        # convert the incoming text data(json string) to python dict to access the action and data
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            await self.send_json({"error": "Invalid JSON received"})
            return
        action = data.get("action")
       
        manager_actions = ["create_post", "update_post", "delete_post"]

        if action in manager_actions and not self.is_manager():
            await self.send_json({"error": "Only managers can perform this action"})
            return  

        if action == "create_post":
            await self.create_post(data)
        elif action == "update_post":
            await self.update_post(data)
        elif action == "delete_post":
            await self.delete_post(data)
        elif action == "get_posts":
            await self.get_posts(data)

    # Database Operations
    async def create_post(self, data):
        @sync_to_async
        def save_post_to_db():
            with schema_context(self.schema_name):
                title = data.get("title")
                content = data.get("content")
                category = data.get("category")

                if not (title and title.strip() and content and content.strip() and category and category.strip()):
                    return {"error": "title, content, and category are required and cannot be empty"}

                image_id = data.get("image_id")
                temp = None # Initialize so it exists even if image_id is None
                if image_id:
                    try:
                        temp = Image.objects.get(id=image_id)
                    except Image.DoesNotExist:
                        return {"error": "Temp image not found"}

                post = Post.objects.create(
                    title=title,
                    content=content,
                    category=category,
                    author=self.user,
                    media_file=temp.file if temp else None 
                )
                
                # Only delete if we actually found a temp image
                if temp:
                    temp.delete()

                return PostSerializer(post).data

        try:
            post_data = await save_post_to_db()
            if isinstance(post_data, dict) and 'error' in post_data:
                await self.send_json(post_data)
                return

            post_data = self.format_dates(post_data)
            
            # Broadcast to News group
            # (Signals will handle the persistent notifications for other users)
            await self.channel_layer.group_send(
                self.group_name, {"type": "broadcast_message", "event": "post_created", "data": post_data}
            )
            
        except Image.DoesNotExist:
             await self.send_json({"error": "Temporary image not found"})
        except Exception as e:
            logger.error(f"Error in create_post: {str(e)}", exc_info=True)
            await self.send_json({"error": "An unexpected error occurred while creating the post"})


# for delete the post best on id 
    async def delete_post(self, data):
        @sync_to_async
        def delete_post_from_db():
            with schema_context(self.schema_name):
                post_id = data.get("id")
                if not post_id:
                    return {"error": "Post ID is required"}
                obj = Post.objects.select_related('author').get(post_id=post_id)
                if obj.author != self.user:
                    raise PermissionError("You can only delete your own posts")
                
                post_title = obj.title
                obj.delete()
                return post_title

        try:
            post_title = await delete_post_from_db()
            await self.channel_layer.group_send(
                self.group_name, {"type": "broadcast_message", "event": "post_deleted", "data": {"id": data.get("id"), "title": post_title}}
            )
        except PermissionError as e:
            await self.send_json({"error": str(e)})
        except Post.DoesNotExist:
            await self.send_json({"error": "Post not found or already deleted"})
        except Exception as e:
            logger.error(f"Error in delete_post: {str(e)}", exc_info=True)
            await self.send_json({"error": "An unexpected error occurred while deleting the post"})

# update the post based on id and send the updated post data to all users in the group
    async def update_post(self, data):
        @sync_to_async
        def update_post_in_db():
            with schema_context(self.schema_name):
                post_id = data.get("id")
                if not post_id:
                    return {"error": "Post ID is required"}
                
                image_id = data.get("image_id")
                temp = None # Initialize so it exists even if image_id is None
                if image_id:
                    try:
                        temp = Image.objects.get(id=image_id)
                    except Image.DoesNotExist:
                        return {"error": "Temp image not found"}

                try:
                    post = Post.objects.select_related('author').get(post_id=post_id)
                    if post.author != self.user:
                        raise PermissionError("You can only update your own posts")
                except Post.DoesNotExist:
                    return {"error": "Post not found"}

                # Update text fields safely and validate if provided
                title = data.get("title")
                content = data.get("content")
                category = data.get("category")

                if title is not None:
                    if not title.strip():
                        return {"error": "title cannot be empty"}
                    post.title = title
                
                if content is not None:
                    if not content.strip():
                        return {"error": "content cannot be empty"}
                    post.content = content
                
                if category is not None:
                    if not category.strip():
                        return {"error": "category cannot be empty"}
                    post.category = category

                # update the image iif the image is already prestent in the post 
                if temp:
                    post.media_file = temp.file 
                    temp.delete() # delete the temp image after saving the post 
                
                post.save()
                return PostSerializer(post).data

        try:
            post_data = await update_post_in_db()
            
            # Check for error signals
            if isinstance(post_data, dict) and 'error' in post_data:
                await self.send_json(post_data)
                return

            post_data = self.format_dates(post_data)
            await self.channel_layer.group_send(
                self.group_name, {"type": "broadcast_message", "event": "post_updated", "data": post_data}
            )
        except PermissionError as e:
            await self.send_json({"error": str(e)})
        except Post.DoesNotExist:
            await self.send_json({"error": "Post not found"})
        except Image.DoesNotExist:
             await self.send_json({"error": "Temporary image not found"})
        except Exception as e:
            logger.error(f"Error in update_post: {str(e)}", exc_info=True)
            await self.send_json({"error": "An unexpected error occurred while updating the post"})

    # get all posts with pagination and send the data to the client that requested it (not broadcast to all users)
    async def get_posts(self, data):
        page_number = data.get("page", 1)

        @sync_to_async
        def fetch_posts_from_db():
            with schema_context(self.schema_name):
                posts = Post.objects.select_related('author').all().order_by("-created_at")
                
                # Apply pagination
                page = Paginator(posts, 10).get_page(page_number)
                data = PostSerializer(page, many=True).data
                return data, page.has_next()

        try:
            posts_data, has_next = await fetch_posts_from_db()
            posts_data = self.format_dates(posts_data)
            await self.send_json({
                "type": "posts",
                "data": posts_data,
                "page": page_number,
                "has_next": has_next
            })
        except Exception as e:
            logger.error(f"Error in get_posts: {str(e)}", exc_info=True)
            await self.send_json({"error": "An unexpected error occurred while fetching posts"})

    # Broadcast helper its send the message to the all clients in the group with the event type and data
    async def broadcast_message(self, event):
        await self.send(text_data=json.dumps({"type": event["event"], "data": event["data"]}))