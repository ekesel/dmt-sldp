# Research: Phase 13 - Identity & Attribution

## 1. Cross-Tool Identity Mapping

### Problem
Work items (Jira) and Pull Requests (GitHub) use different identifiers (emails, usernames). To calculate per-developer productivity metrics, we must map these diverse external identities to a single internal platform `User`.

### Solution: Centralized Identity Mapping
We will implement an `ExternalUserMapping` model to create a "Rosetta Stone" for user identities.

```python
class ExternalIdentity(models.Model):
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='external_identities')
    provider = models.CharField(max_length=20, choices=Integration.SOURCE_TYPES)
    external_id = models.CharField(max_length=255) # Email or Username
    
    class Meta:
        unique_together = ('provider', 'external_id')
```

### Resolution Logic (Priority)
1. **Explicit Mapping**: Check `ExternalIdentity` table for direct match.
2. **Email Match**: Match `assignee_email` (Jira) or `author_email` (GitHub) with internal `User.email`.
3. **Username Match**: Match GitHub username with internal `User.username`.

---

## 2. Granular Attribution

### Objective
Provide metrics like "PRs per User" or "Compliance Rate per Developer".

### Implementation
- `WorkItem` will be updated to include a `resolved_assignee` ForeignKey to `users.User`.
- `PullRequest` will be updated to include a `resolved_author` ForeignKey to `users.User`.
- An `IdentityService` will handle the resolution during data synchronization.

### Benefits
- **Granularity**: Move from tenant-level metrics to developer-level accountability.
- **Accuracy**: Resolves discrepancies when users use different emails for GitHub and Jira.
- **Portability**: New tools (e.g., GitLab, ClickUp) can be added simply by adding identities.
