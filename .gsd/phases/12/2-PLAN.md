---
phase: 12
plan: 2
wave: 1
---

# Plan 12.2: Celery Scaling & Docker Orchestration

## Objective
Isolate heavy AI workloads from critical data synchronization tasks by implementing dedicated Celery queues and separate worker containers in Docker.

## Context
- [.gsd/phases/12/RESEARCH.md](file:///Users/ekesel/Desktop/projects/DMT-SLDP/.gsd/phases/12/RESEARCH.md)
- [docker-compose.yml](file:///Users/ekesel/Desktop/projects/DMT-SLDP/docker-compose.yml)
- [backend/core/celery.py](file:///Users/ekesel/Desktop/projects/DMT-SLDP/backend/core/celery.py)

## Tasks

<task type="auto">
  <name>Configure Celery Queues</name>
  <files>
    <file>backend/core/celery.py</file>
    <file>backend/data/ai/tasks.py</file>
  </files>
  <action>
    In `celery.py`, set `task_queues` using `kombu.Queue` to define 'celery' (default) and 'ai_insights'.
    Update `@shared_task` for `refresh_ai_insights` to include `queue='ai_insights'`.
  </action>
  <verify>grep "queue='ai_insights'" backend/data/ai/tasks.py</verify>
  <done>Tasks are routed to specific queues in code.</done>
</task>

<task type="auto">
  <name>Scale Docker Workers</name>
  <files>
    <file>docker-compose.yml</file>
  </files>
  <action>
    Refactor the `celery-worker` service into two services:
    1.  `worker-default`: Command `celery -A core worker -l info -Q celery`
    2.  `worker-ai`: Command `celery -A core worker -l info -Q ai_insights`
    Ensure both have the same environment and volume configurations.
  </action>
  <verify>docker-compose ps | grep "worker-ai"</verify>
  <done>Docker-compose manages two distinct worker containers listening to separate queues.</done>
</task>

## Success Criteria
- [ ] `worker-default` only processes sync/aggregation tasks.
- [ ] `worker-ai` only processes AI insight tasks.
- [ ] A flood of AI tasks does not delay the processing of a new data sync task.
