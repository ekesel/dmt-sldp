 Tag API (Manager Only Access)
Base URL
http://samta.localhost:8000/api/kb/tags/
________________________________________
Access Control
•	Only users with the Manager role can access this API. Means he /she can do only create and get tags 
•	If a non-manager tries to create tag then he will get error :
•	Normal user only can get the tags 
{
  "error": ""You do not have permission to perform this action."
}
________________________________________
1. Get Tags
Request
•	Method: GET 
•	Endpoint: /tags/ 
Response
[
  {
    "id": 1,
    "name": "ui"
  },
  {
    "id": 2,
    "name": "backend"
  },
  {
    "id": 3,
    "name": "uixi"
  }
]
________________________________________
2. Create Tag
Request
•	Method: POST 
•	Endpoint: /tags/ 
•	Body: 
{
  "name": "frontend"
}
Response
{
  "id": 10,
  "name": "frontend"
}

Metadata Category API
Base URL
http://samta.localhost:8000/api/kb/metadata/categories/
________________________________________
Access Control
•	GET → Accessible by all users 
•	POST → Only users with Manager role 
•	If a non-manager tries to create: 
{
  "error": " You do not have permission to perform this action"
}
________________________________________
1. Get All Categories
Request
•	Method: GET 
•	Endpoint: /metadata/categories/ 
Response
[
  {
    "id": 1,
    "name": "project"
  },
  {
    "id": 2,
    "name": "team"
  },
  {
    "id": 3,
    "name": "type"
  }
]
________________________________________
2. Create Category
Request
•	Method: POST 
•	Endpoint: /metadata/categories/ 
•	Body: 
{
  "name": "xyz"
}
Response
{
  "id": 4,
  "name": "xyz"
}


For creating  values to that meta category - 

POST /baseurl/metadata/values/
Access: Manager only
Request Body
{
  "category": 1,
  "value": "alpha"
}
Response
{
  "id": 1,
  "category": 1,
  "category_name": "project",
  "value": "alpha"
}
________________________________________
 List Endpoint
GET /metadata/values
Access: All users
Response
[
  {
    "id": 1,
    "category": 1,
    "category_name": "project",
    "value": "alpha"
  },
  {
    "id": 2,
    "category": 2,
    "category_name": "department",
    "value": "beta"
  }
]



Filter by Category
GET /metadata/values/?category=1
Access: All users
________________________________________
Response
[
  {
    "id": 1,
    "category": 1,
    "category_name": "project",
    "value": "alpha"
  },
  {
    "id": 2,
    "category": 1,
    "category_name": "project",
    "value": "beta"
  }
]













Create Document
POST /documents/
Access: Manager only
Content-Type: multipart/form-data
________________________________________
Request (Form Data)
title: "invoice doc"
owner: 2
tags: [1, 2, 3]
metadata: [1, 2, 3]
file: <file_upload_or_url>
Field Details
•	title → Name of the document 
•	owner → User ID of the document owner 
•	tags → List of tag IDs 
•	metadata → List of metadata value IDs 
o	1 → project: docs 
o	2 → team: alpha team 
o	3 → type: ppt 
•	file → File upload (preferred) or file URL 
________________________________________
Response
{
    "data": {
        "id": 11,
        "title": "abc123xyz123",
        "created_by": 13,
        "owner": 13,
        "status": "DRAFT",
        "created_at": "2026-04-13T06:34:45.476262Z",
        "tags": [
            1,
            2,
            3,
            4,
            5
        ],
        "metadata_values": [
            1,
            3,
            6
        ],
        "tag_details": [
            {
                "id": 1,
                "name": "Finance"
            },
            {
                "id": 2,
                "name": "Backend"
            },
            {
                "id": 3,
                "name": "ui"
            },
            {
                "id": 4,
                "name": "ai"
            },
            {
                "id": 5,
                "name": "aiml"
            }
        ],
        "metadata_details": [
            {
                "id": 1,
                "category": "Project",
                "value": "Alpha"
            },
            {
                "id": 3,
                "category": "type",
                "value": "ppt"
            },
            {
                "id": 6,
                "category": "team",
                "value": "team_Backend"
            }
        ]
    },
    "msg": "Document created"
}










Get Documents Belonging to Logged-in User (For Review)
 Endpoint
GET /api/kb/documents/?mine=true

 Description
Returns all documents where the logged-in user is the owner.
Used for review workflows (Draft / Approved / Rejected).

[
    {
        "id": 2,
        "title": "Invoice Doc",
        "created_by": 13,
        "owner": 13,
        "status": "APPROVED",
        "created_at": "2026-04-08T06:52:50.746612Z",
        "tags": [
            1,
            2
        ],
        "metadata_values": [],
        "tag_details": [
            {
                "id": 1,
                "name": "Finance"
            },
            {
                "id": 2,
                "name": "Backend"
            }
        ],
        "metadata_details": []
    },
    {
        "id": 3,
        "title": "Invoice Doc",
        "created_by": 13,
        "owner": 13,
        "status": "DRAFT",
        "created_at": "2026-04-08T06:55:44.333925Z",
        "tags": [
            1,
            2
        ],
        "metadata_values": [],
        "tag_details": [
            {
                "id": 1,
                "name": "Finance"
            },
            {
                "id": 2,
                "name": "Backend"
            }
        ],
        "metadata_details": []
    },
    {
        "id": 4,
        "title": "boom",
        "created_by": 13,
        "owner": 13,
        "status": "DRAFT",
        "created_at": "2026-04-08T06:57:39.919629Z",
        "tags": [
            1,
            2
        ],
        "metadata_values": [],
        "tag_details": [
            {
                "id": 1,
                "name": "Finance"
            },
            {
                "id": 2,
                "name": "Backend"
            }
        ],
        "metadata_details": []
    },
    {
        "id": 5,
        "title": "Approch doc",
        "created_by": 13,
        "owner": 13,
        "status": "REJECTED",
        "created_at": "2026-04-08T09:01:01.728986Z",
        "tags": [
            1,
            2
        ],
        "metadata_values": [],
        "tag_details": [
            {
                "id": 1,
                "name": "Finance"
            },
            {
                "id": 2,
                "name": "Backend"
            }
        ],
        "metadata_details": []
    },
    {
        "id": 11,
        "title": "abc123xyz123",
        "created_by": 13,
        "owner": 13,
        "status": "DRAFT",
        "created_at": "2026-04-13T06:34:45.476262Z",
        "tags": [
            1,
            2,
            3,
            4,
            5
        ],
        "metadata_values": [
            1,
            3,
            6
        ],
        "tag_details": [
            {
                "id": 1,
                "name": "Finance"
            },
            {
                "id": 2,
                "name": "Backend"
            },
            {
                "id": 3,
                "name": "ui"
            },
            {
                "id": 4,
                "name": "ai"
            },
            {
                "id": 5,
                "name": "aiml"
            }
        ],
        "metadata_details": [
            {
                "id": 1,
                "category": "Project",
                "value": "Alpha"
            },
            {
                "id": 3,
                "category": "type",
                "value": "ppt"
            },
            {
                "id": 6,
                "category": "team",
                "value": "team_Backend"
            }
        ]
    },
    {
        "id": 12,
        "title": "hiiiiHellllllllooooooooo",
        "created_by": 13,
        "owner": 13,
        "status": "DRAFT",
        "created_at": "2026-04-13T06:48:43.438983Z",
        "tags": [
            1,
            2,
            3,
            4,
            5
        ],
        "metadata_values": [
            1,
            3,
            6
        ],
        "tag_details": [
            {
                "id": 1,
                "name": "Finance"
            },
            {
                "id": 2,
                "name": "Backend"
            },
            {
                "id": 3,
                "name": "ui"
            },
            {
                "id": 4,
                "name": "ai"
            },
            {
                "id": 5,
                "name": "aiml"
            }
        ],
        "metadata_details": [
            {
                "id": 1,
                "category": "Project",
                "value": "Alpha"
            },
            {
                "id": 3,
                "category": "type",
                "value": "ppt"
            },
            {
                "id": 6,
                "category": "team",
                "value": "team_Backend"
            }
        ]
    },
    {
        "id": 13,
        "title": "hiiiiHellllllllooooooooo",
        "created_by": 13,
        "owner": 13,
        "status": "DRAFT",
        "created_at": "2026-04-13T06:49:31.512438Z",
        "tags": [
            1,
            2,
            3,
            4,
            5
        ],
        "metadata_values": [
            1,
            3,
            6
        ],
        "tag_details": [
            {
                "id": 1,
                "name": "Finance"
            },
            {
                "id": 2,
                "name": "Backend"
            },
            {
                "id": 3,
                "name": "ui"
            },
            {
                "id": 4,
                "name": "ai"
            },
            {
                "id": 5,
                "name": "aiml"
            }
        ],
        "metadata_details": [
            {
                "id": 1,
                "category": "Project",
                "value": "Alpha"
            },
            {
                "id": 3,
                "category": "type",
                "value": "ppt"
            },
            {
                "id": 6,
                "category": "team",
                "value": "team_Backend"
            }
        ]
    }
]




 Get All Documents
GET /documents
Access: All users
Note: Returns only approved documents
________________________________________
Response
[
  {
    "id": 1,
    "title": "invoice",
    "status": "approved",
    "tag_details": [
      {
        "id": 1,
        "name": "finance"
      },
      {
        "id": 2,
        "name": "urgent"
      }
    ],
    "metadata": [
      {
        "category": "project",
        "value": "docs"
      },
      {
        "category": "team",
        "value": "alpha team"
      },
      {
        "category": "type",
        "value": "ppt"
      }
    ]
  },
  {
    "id": 2,
    "title": "report",
    "status": "approved",
    "tag_details": [
      {
        "id": 3,
        "name": "analysis"
      }
    ],
    "metadata": [
      {
        "category": "project",
        "value": "research"
      }
    ]
  }
]












Get Single Document
GET /documents/9/
Access: All users
Note: Returns the document only if status = approved
________________________________________
 Response


{
    "data": {
        "id": 9,
        "title": "Amazon sde",
        "created_by": 13,
        "owner": 13,
        "status": "APPROVED",
        "created_at": "2026-04-08T11:09:23.448921Z",
        "tags": [
            1,
            2,
            3
        ],
        "metadata_values": [
            1,
            3,
            6
        ],
        "tag_details": [
            {
                "id": 1,
                "name": "Finance"
            },
            {
                "id": 2,
                "name": "Backend"
            },
            {
                "id": 3,
                "name": "ui"
            }
        ],
        "metadata_details": [
            {
                "id": 1,
                "category": "Project",
                "value": "Alpha"
            },
            {
                "id": 3,
                "category": "type",
                "value": "ppt"
            },
            {
                "id": 6,
                "category": "team",
                "value": "team_Backend"
            }
        ]
    },
    "latest_version": {
        "id": 13,
        "document": 9,
        "file": "/media/samta/documents/amazon-sde/v2/Beige__Blue_Simple_Brush_Personal_LinkedIn_Banner.png",
        "version_number": 2,
        "uploaded_by": 13,
        "created_at": "2026-04-09T09:58:08.620909Z"
    },
    "msg": "Document fetched"
}



 Get User Details
GET /users
Access: only manger can do this action.. this api will give only username and id of all the manger in that tenant
________________________________________
Response
[
  {
    "id": 1,
    "username": "rahul"
  },
  {
    "id": 2,
    "username": "john_doe"
  }
]



  Filter Documents by Tag
GET /documents/?tag=1
Access: All users
Returns: Only approved documents that include the given tag
________________________________________
 Response
[
  {
    "id": 1,
    "title": "invoice doc",
    "status": "approved",
    "tag_details": [
      {
        "id": 1,
        "name": "finance"
      }
    ],
    "metadata": [
      {
        "category": "project",
        "value": "docs"
      },
      {
        "category": "team",
        "value": "alpha team"
      },
      {
        "category": "type",
        "value": "ppt"
      }
    ]
  },
  {
    "id": 2,
    "title": "budget report",
    "status": "approved",
    "tag_details": [
      {
        "id": 1,
        "name": "finance"
      }
    ],
    "metadata": [
      {
        "category": "project",
        "value": "finance"
      }
    ]
  }
]

	


 Update Document – 
PATCH  /documents/1/
Access: Manager only
________________________________________
Request Body
{
  "title": "up",
  "metadata": [2, 3, 4],
  "tags": [1, 2, 3]
}
________________________________________
 Response
{
  "message": "updated"
}
________________________________________
 Error Cases
Document Not Found
{
  "message": "Document not found"
}
Unauthorized
{
  "message": "Only manager can update document"
}


Delete Document
DELETE /documents/1/
Access: Manager only
________________________________________
Response
{
  "message": "deleted"
}
________________________________________ Error Cases
Document Not Found
{
  "message": "Document not found"
}
Unauthorized
{
  "message": "Only manager can delete document"
}




Workflow API – (Accessible only by Manager)
Endpoint:
POST /documents/{id}/status/
Description:
Update the status of a document. This action is restricted to users with the Manager role.
________________________________________
Request Body:
{
  "status": "REJECTED"
}




Response  -
{
    "msg": "Document status updated to REJECTED",
    "data": {
        "status": "REJECTED"
    }
}

________________________________________
Notes:
•	Replace {id} with the actual document ID (e.g., /documents/1/status/) 
•	"status" should typically be one of the allowed values, such as: 
o	"APPROVED" 
o	"REJECTED" 
________________________________________
Example Request:
POST /documents/1/status/
Content-Type: application/json
Authorization: Bearer <token>
{
  "status": "REJECTED"
}
________________________________________
Expected Behavior:
•	 If the user is a Manager → status updates successfully 
•	 If not authorized → return 403 Forbidden 
•	If invalid status → return 400 Bad Request

Upload New Version API
Endpoint:
POST /documents/{doc_id}/upload-version/
Description:
Upload a new version of an existing document.
________________________________________
Request (Form Data):
Content-Type: multipart/form-data
Body:
file: <binary_file>
________________________________________
Example Request:
POST /documents/1/upload-version/
Authorization: Bearer <token>
Content-Type: multipart/form-data
Form-data:
file: document_v2.pdf
________________________________________
Response:
{
  "message": "New version uploaded successfully"
}


List All Versions of a Document
Endpoint:
GET /documents/{doc_id}/versions/
Description:
Retrieve all versions of a specific document.
________________________________________
Example Request:
GET /documents/9/versions/
Authorization: Bearer <token>
________________________________________
Response:
{
  "document_id": 9,
  "versions": [
    {
      "id": 9,
      "version_number": 1,
      "file_url": "/media/samta/documents/amazon-sde/v1/Tcs_DT20246088230_JL.pdf",
      "uploaded_by": 13,
      "created_at": "2026-04-08T11:09:23.557156Z"
    },
    {
      "id": 13,
      "version_number": 2,
      "file_url": "/media/samta/documents/amazon-sde/v2/Beige__Blue_Simple_Brush_Personal_LinkedIn_Banner.png",
      "uploaded_by": 13,
      "created_at": "2026-04-09T09:58:08.620909Z"
    }
  ]
}




Document that belongs to the one owner – 
Get  http://samta.localhost:8000/api/kb/documents/?mine=true

response – 
[
  {
    "id": 3,
    "title": "Invoice Doc",
    "status": "REJECTED",
    "created_at": "2026-04-08T06:55:44Z",
    "owner": {
      "id": 13
    },
    "tags": [
      { "id": 1, "name": "Finance" },
      { "id": 2, "name": "Backend" }
    ],
    "metadata": []
  },
  {
    "id": 4,
    "title": "boom",
    "status": "DRAFT",
    "created_at": "2026-04-08T06:57:39Z",
    "owner": {
      "id": 13
    },
    "tags": [
      { "id": 1, "name": "Finance" },
      { "id": 2, "name": "Backend" }
    ],
    "metadata": []
  },
  {
    "id": 5,
    "title": "Approch doc",
    "status": "REJECTED",
    "created_at": "2026-04-08T09:01:01Z",
    "owner": {
      "id": 13
    },
    "tags": [
      { "id": 1, "name": "Finance" },
      { "id": 2, "name": "Backend" }
    ],
    "metadata": []
  },
  {
    "id": 9,
    "title": "Amazon sde",
    "status": "DRAFT",
    "created_at": "2026-04-08T11:09:23Z",
    "owner": {
      "id": 13
    },
    "tags": [
      { "id": 1, "name": "Finance" },
      { "id": 2, "name": "Backend" },
      { "id": 3, "name": "ui" }
    ],
    "metadata": [
      { "id": 1, "category": "Project", "value": "Alpha" },
      { "id": 3, "category": "type", "value": "ppt" },
      { "id": 6, "category": "team", "value": "team_Backend" }
    ]
  }
]
