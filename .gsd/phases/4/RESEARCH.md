# Research - Phase 4: Git Source Expansion (GitHub)

## Goal
Implement a functional GitHub connector to synchronize Pull Requests and link them to existing WorkItems (Jira/ClickUp).

## GitHub API Strategy
- **Endpoint**: `GET /repos/{owner}/{repo}/pulls`
- **Authentication**: Personal Access Token (PAT) via `Authorization: Bearer <token>` or `token <token>`.
- **Pagination**: Use `per_page=100` and follow the `Link` header `rel="next"`.
- **Payload Mapping**:
  - `external_id` -> `number` (or `id`)
  - `title` -> `title`
  - `status` -> `state` (mapped to open, closed, merged)
  - `repository_name` -> `base.repo.full_name`
  - `source_branch` -> `head.ref`
  - `target_branch` -> `base.ref`
  - `merged_at` -> `merged_at`

## Implementation Options

| Option | Pros | Cons |
|--------|------|------|
| **Manual (requests)** | Zero new dependencies, consistent with `jira.py`. | Manual handling of pagination and error codes. |
| **PyGithub** | Robust, handles pagination automatically. | New heavyweight dependency. |

**Decision**: Use `requests` for the initial implementation to keep the footprint small and maintain consistency with other connectors.

## PR-to-WorkItem Matching Logic
1. **Title Pattern**: Look for regex patterns in PR titles (e.g., `[JIRA-123]`).
2. **Branch Pattern**: Look for branch names like `feature/JIRA-123-description`.
3. **Reference**: If a match is found, link the `PullRequest` to the corresponding `WorkItem` via `external_id`.

## Security
GitHub PATs must be stored as encrypted secrets or environment variables. Phase 1 already moved `api_key` to the database/environment layer.
