I have successfully set up the project end-to-end and fixed the core issues that were preventing access to the portals.

Key Fixes and Improvements
Public Tenant Setup: Implemented the mandatory public tenant record and associated domains (localhost, backend, testserver, 127.0.0.1) in the database. This resolves the 404 Not Found errors when accessing the base API or Admin portal.
Admin Authentication:
Promoted the existing user rahulpandit to Platform Admin status.
Set a known password: admin123.
You can now log in to the Admin Portal at http://localhost:3001.
Service Connectivity:
Verified that all Docker containers are running smoothly (Backend, Redis, Postgres, Celery Workers/Beat).
Ensured the frontend 

rewrites
 (Next.js proxy) correctly target the backend service within the Docker network.
Multi-Tenant Routing: Confirmed that the X-Tenant header and hostname-based tenant detection are working as intended for the Company Portal.
Access Guide
Portal	URL	Purpose
Admin Portal	http://localhost:3001	Manage Tenants, Projects, and Users.
Company Portal (Samta)	http://samta.localhost:3000	View dashboards for the "Samta" tenant.
Company Portal (Enterprise)	http://enterprise.localhost:3000	View dashboards for the "Enterprise" tenant.
Backend / API	http://localhost:8000/api/	Direct access to the Django REST API.

Login Credentials for Admin Portal:

adminPortal - 
Username: rahulpandit
Password: admin123



for samta tenant
- Manager
http://samta.localhost:3000
login - 
username = arun.singh@samta.ai
password = 12345678
