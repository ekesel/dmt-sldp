Unified Newsfeed
News WebSocket API Contract
Version 1.0 · March 2026 · Internal Reference

1. Overview
   This document is the WebSocket API contract for the Unified Newsfeed service (Django Channels). It defines the connection URL, authentication requirements, all client-to-server actions, real server response schemas, and a complete error reference.

2. Connection
   WebSocket URL Pattern
   ws://<tenant_name>.localhost:8000/ws/news/?token=<user_token>

Parameter Description
<tenant_name> Tenant / schema name (e.g. samta)
<user_token> JWT access token — passed as a query-string parameter

Real Connection Examples
Manager connecting:
ws://samta.localhost:8000/ws/news/?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzczMzA0NzgxLCJpYXQiOjE3NzMzMDExODEsImp0aSI6ImU1MjQxMmUzNjJiMjRiYTc4ZGFhMGFmM2ZjM2M2MDg3IiwidXNlcl9pZCI6IjE4IiwiaXNfcGxhdGZvcm1fYWRtaW4iOmZhbHNlfQ.oaPtlXqwh_O3ZYsDP7Kcv8PgvCY72G_Zr2_Uc-ZmprE

Normal user connecting:
ws://samta.localhost:8000/ws/news/?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzczMzA0NzgxLCJpYXQiOjE3NzMzMDExODEsImp0aSI6ImU1MjQxMmUzNjJiMjRiYTc4ZGFhMGFmM2ZjM2M2MDg3IiwidXNlcl9pZCI6IjE4IiwiaXNfcGxhdGZvcm1fYWRtaW4iOmZhbHNlfQ.oaPtlXqwh_O3ZYsDP7Kcv8PgvCY72G_Zr2_Uc-ZmprE

3. Authentication & Permissions
   Every WebSocket connection must carry a valid JWT access token in the query string. The server rejects connections with missing or expired tokens before processing any message.

Action Allowed Role
create_post Managers only
update_post Managers only
delete_post Managers only
get_posts All authenticated users

• Non-managers attempting a restricted action receive an error — the connection stays open.
• Broadcast events are tenant-scoped: users on other tenants never receive them.
• Tokens are sent via query string only — not in headers or message payloads.

4. Client → Server Actions
   4.1 create_post
   MANAGERS ONLY
   Creates a new post and broadcasts it to every connected user in the tenant group.

Request Fields
Field Type Description
action string Always "create_post"
title string Post headline — required
content string Post body text — required
category string Category string e.g. "Tech", "news"
author integer Author user ID — required
media_file string|null File URL or null — optional

Frontend Request (sent from browser)
{
"action": "create_post",
"title": "Breaking News",
"content": "Django Channels is powerful",
"category": "Tech",
"author": 1,
"media_file": null
}

Server Response (broadcast to tenant group)
{
"type": "post_created",
"data": {
"post_id": 123,
"title": "Breaking News",
"content": "Django Channels is powerful",
"category": "Tech",
"media_file": null,
"author": {
"id": 1,
"username": "rahulpandit",
"email": "",
"first_name": "",
"last_name": "",
"tenant": null,
"is_platform_admin": true,
"is_staff": true,
"is_superuser": true,
"is_manager": false,
"is_active": true,
"date_joined": "2026-03-10T06:31:14.557176Z",
"profile_picture": null,
"custom_title": null,
"competitive_title": null,
"competitive_title_reason": null,
"avatar_url": "https://www.gravatar.com/avatar/...?d=identicon&s=200"
},
"created_at": "2026-03-11 19:27:49",
"updated_at": "2026-03-11 19:27:49"
}
}

Errors
Unauthorized user:
{ "error": "Only managers can perform this action" }

Missing required field:
{ "error": "Missing required field: title" }

Invalid or expired token:
{ "error": "Invalid or expired token" }

4.2 update_post
MANAGERS ONLY
Updates fields of an existing post. Broadcasts the full updated post to the tenant group.

Request Fields
Field Type Description
action string Always "update_post"
id integer Post ID to update — required
title string New title — optional
content string New body text — optional
category string New category — optional
media_file string|null New file URL or null — optional

Frontend Request (sent from browser)
{
"action": "update_post",
"id": 2,
"title": "Updated Title",
"content": "Updated content"
}

Server Response (broadcast to tenant group)
{
"type": "post_updated",
"data": {
"post_id": 2,
"title": "Updated Title",
"content": "Updated content",
"category": "announcement",
"media_file": null,
"author": {
"id": 1,
"username": "rahulpandit",
"email": "",
"first_name": "",
"last_name": "",
"tenant": null,
"is_platform_admin": true,
"is_staff": true,
"is_superuser": true,
"is_manager": false,
"is_active": true,
"date_joined": "2026-03-10T06:31:14.557176Z",
"profile_picture": null,
"custom_title": null,
"competitive_title": null,
"competitive_title_reason": null,
"avatar_url": "https://www.gravatar.com/avatar/...?d=identicon&s=200"
},
"created_at": "2026-03-11 19:32:13",
"updated_at": "2026-03-12 12:08:59"
}
}

Errors
Post not found:
{ "error": "Post matching query does not exist." }

Unauthorized user:
{ "error": "Only managers can perform this action" }

Invalid or expired token:
{ "error": "Invalid or expired token" }

4.3 delete_post
MANAGERS ONLY
Deletes a post by ID and broadcasts a lightweight confirmation to the tenant group.

Request Fields
Field Type Description
action string Always "delete_post"
id integer Post ID to delete — required

Frontend Request (sent from browser)
{
"action": "delete_post",
"id": 4
}

Server Response (broadcast to tenant group)
{
"type": "post_deleted",
"data": {
"id": 1,
"title": "Breaking News"
}
}

Errors
Post not found:
{ "error": "Post matching query does not exist." }

Unauthorized user:
{ "error": "Only managers can perform this action" }

Invalid or expired token:
{ "error": "Invalid or expired token" }

4.4 get_posts
ALL AUTHENTICATED USERS
Returns a paginated list of posts. Response is unicast — sent only to the requesting client, never broadcast.

Request Fields
Field Type Description
action string Always "get_posts"
page integer Page number — optional, defaults to 1

• Returns 5 posts per page.
• has_next (boolean) signals whether a next page exists.

Frontend Request (sent from browser)
{
"action": "get_posts",
"page": 2
}

Server Response (sent only to requesting client)
{
"type": "posts",
"data": [
{
"post_id": 1,
"title": "Breaking News",
"content": "Hello world",
"category": "news",
"media_file": null,
"author": {
"id": 1,
"username": "rahulpandit",
"email": "",
"first_name": "",
"last_name": "",
"tenant": null,
"is_platform_admin": true,
"is_staff": true,
"is_superuser": true,
"is_manager": false,
"is_active": true,
"date_joined": "2026-03-10T06:31:14.557176Z",
"profile_picture": null,
"custom_title": null,
"competitive_title": null,
"competitive_title_reason": null,
"avatar_url": "https://www.gravatar.com/avatar/...?d=identicon&s=200"
},
"created_at": "2026-03-11 19:27:49",
"updated_at": "2026-03-11 19:27:49"
}
],
"page": 2,
"has_next": false
}

Errors
No posts on requested page:
{ "error": "No posts found on page 5" }

Invalid or expired token:
{ "error": "Invalid or expired token" }

5. Timestamp Formats

Field Format
created_at YYYY-MM-DD HH:MM:SS
updated_at YYYY-MM-DD HH:MM:SS
date_joined YYYY-MM-DDTHH:MM:SS.ffffffZ (ISO 8601 UTC)

"created_at": "2026-03-11 19:27:49"
"updated_at": "2026-03-12 12:08:59"
"date_joined": "2026-03-10T06:31:14.557176Z"

6. Error Reference

Error Condition Response JSON
Unauthorized (manager action) { "error": "Only managers can perform this action" }
Post not found { "error": "Post matching query does not exist." }
Missing required field { "error": "Missing required field: <field_name>" }
Invalid or expired token { "error": "Invalid or expired token" }
No posts on requested page { "error": "No posts found on page <page>" }

7. Behaviour Notes
   • JWT token must be in the WebSocket URL query string (?token=...). Missing tokens cause immediate rejection.
   • media_file is optional in create_post and update_post; pass null if no file is attached.
   • author field in create_post request is the user ID integer (e.g. 1). The full author object is returned in the response.
   • Broadcast events (post_created, post_updated, post_deleted) are tenant-scoped — other tenants never see them.
   • get_posts is unicast: only the requesting client receives the data array.
   • Pagination: 5 posts per page. Use has_next to determine if further pages exist.
   • Error responses never close the WebSocket connection — the client can continue sending messages.
