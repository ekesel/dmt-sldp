# Code Review: Knowledge Base Feature

- **Branch:** feature/knowledge-base
- **Lens Used:** Race Conditions / Logic
- **Date:** 2026-04-24

---

## Pillar 1: Logical Issues

### [CRITICAL] Client-side filtering on server-paginated data
- **Pillar:** Logical Issue
- **File:** [RecordList.tsx](file:///media/himanshu/New%20Volume/samta/dmt-sldp/frontend/apps/app/components/knowledge/RecordList.tsx)
- **Lines:** 4478-4490
- **Problem:** The component fetches records for a category (e.g., "Team") but then filters by the specific team value (e.g., "Engineering") locally using `displayRecords` useMemo.
- **Impact:** If the API is paginated (returning 10-20 results), the local filter will only see the first page. If the selected team's documents are on page 2+, they will never appear in the list. Filtering by metadata value MUST happen on the server.

### [MAJOR] Pagination Metadata Discarded
- **Pillar:** Logical Issue
- **File:** [records-api.ts](file:///media/himanshu/New%20Volume/samta/dmt-sldp/frontend/packages/api/knowledge-base-apis/records-api.ts)
- **Lines:** 11541-11557
- **Problem:** `knowledgeRecords.search` and `list` methods call `toDocumentItems`, which extracts the `results` array but throws away `count`, `next`, and `previous` pagination metadata.
- **Impact:** Breaks the ability to implement proper pagination or infinite scroll. The UI will only ever show the first page of results.

### [MAJOR] Authenticated View failure for Office Documents
- **Pillar:** Logical Issue
- **File:** [records-api.ts](file:///media/himanshu/New%20Volume/samta/dmt-sldp/frontend/packages/api/knowledge-base-apis/records-api.ts)
- **Lines:** 11722-11732
- **Problem:** `viewFile` uses Google Docs Viewer (`https://docs.google.com/viewer?url=...`) for Office documents (docx, xlsx, etc.).
- **Impact:** Google Docs Viewer cannot access private files that require the `Authorization` or `X-Tenant` headers. This will fail with a 401/403 for all authenticated documents.

### [MAJOR] Incorrect Review Count
- **Pillar:** Logical Issue
- **File:** [useKnowledgeRecords.ts](file:///media/himanshu/New%20Volume/samta/dmt-sldp/frontend/apps/app/features/knowledge-base/hooks/useKnowledgeRecords.ts)
- **Lines:** 51-57
- **Problem:** `useReviewCount` calls `useRecords({ mine: true })` and filters the result array locally.
- **Impact:** Similar to the list filtering issue, if a user has more than one page of documents, the count will only reflect those on the first page.

---

## Pillar 2: Duplication / AI Slop

### [MINOR] Hardcoded Base URL for Media
- **Pillar:** Duplication / slop
- **File:** [records-api.ts](file:///media/himanshu/New%20Volume/samta/dmt-sldp/frontend/packages/api/knowledge-base-apis/records-api.ts)
- **Lines:** 11440
- **Problem:** `const mediaBaseUrl = "https://samta.elevate.samta.ai/";` is hardcoded.
- **Impact:** Prevents the app from working correctly in different environments (staging, local dev, production) without manual code changes. Use `process.env.NEXT_PUBLIC_MEDIA_URL` or similar.

---

## Pillar 3: Code Quality

### [MAJOR] Expensive iteration in Card Rendering
- **Pillar:** Code Quality
- **File:** [RecordList.tsx](file:///media/himanshu/New%20Volume/samta/dmt-sldp/frontend/apps/app/components/knowledge/RecordList.tsx)
- **Lines:** 4365-4369
- **Problem:** `resolveUserName` is defined inside the component and performs a `.find()` on the `managers` array. It is passed down and called by every `RecordCard`.
- **Impact:** O(N*M) complexity in the render path. With 50 records and 100 managers, this is 5,000 iterations per render. Memoize the `managers` into a Map or use `useMemo` for the resolver function.

### [MINOR] Unmemoized derived metadata state
- **Pillar:** Code Quality
- **File:** [RecordEditor.tsx](file:///media/himanshu/New%20Volume/samta/dmt-sldp/frontend/apps/app/components/knowledge/RecordEditor.tsx)
- **Lines:** 4734-4737
- **Problem:** `valuesByCategory` uses `.reduce` and `.filter` to restructure metadata values on every render.
- **Impact:** Unnecessary CPU cycles on every keystroke in the editor. Wrap in `useMemo`.

---

## Pillar 4: Complexity

### [MAJOR] "Magic" Search Context Pivoting
- **Pillar:** Complexity
- **File:** [page.tsx](file:///media/himanshu/New%20Volume/samta/dmt-sldp/frontend/apps/app/app/(dashboard)/knowledge-base/page.tsx)
- **Lines:** 4165-4185
- **Problem:** `handleSearchChange` automatically switches the "active view" (Category, Team, or Tag) if the search query happens to match a metadata value or tag name exactly.
- **Impact:** Jarring UX. If a user searches for a term that happens to be a tag, they lose their current filtering context. It also makes it impossible to search for the *text* "Engineering" within the "Project" category if "Engineering" is also a Team name.

---

## Dynamic Review Layer

### Rotating Lens: Race Conditions
- **Issue:** In `RecordList.tsx`, `handleQuickDownload` and `handleQuickView` are async but don't check for unmounted state or cancel previous requests if the user clicks multiple cards rapidly.
- **Issue:** In `KnowledgeBasePage`, there's a risk of stale state if `categories` or `allValues` load at different times during initial mount, though React Query's caching mitigates this.

### Open-Ended Questions
1. **What is the simplest thing that could go wrong?** A user selects a team with 50 documents, but the API returns the first 10 documents of the *entire category* (randomly), and none of them belong to that team. The user sees an empty list and thinks the data is gone.
2. **What does this code assume is always true?** It assumes that the number of documents in any given metadata category will always be small enough to fit on the first page of an API response.

---

## Checklist Self-Update
- [x] **New issue class found:** Client-side filtering on server-paginated data (Added to Pillar 1).
- [x] **New issue class found:** Authentication bypass in third-party viewer (Added to Pillar 1).

---

## Commit Scope Constraints
- [x] `frontend/admin/package-lock.json` was deleted; verify if this was intentional or a merge mistake.
- [x] `frontend/app/hooks/useSessionMonitor.ts` was deleted; ensure the replacement interceptor logic in `packages/api/index.ts` covers all previous edge cases.
