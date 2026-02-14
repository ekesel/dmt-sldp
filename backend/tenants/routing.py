from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/admin/health/$', consumers.AdminHealthConsumer.as_asgi()),
]
