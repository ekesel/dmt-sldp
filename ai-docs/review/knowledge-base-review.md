# Code Review - feature/knowledge-base

Review of the `feature/knowledge-base` branch against the project guidelines in `AGENTS.md` and `ai-docs/pattern/review-pattern.md`.

## Dynamic Review Layer
- **Lens Used:** Prop Contract Integrity
- **Findings:** Optional props in `RecordListProps` and `RecordDetailProps` are safely handled.

---

## Findings

### CRITICAL Client-side operations on server-paginated data
- **Pillar:** Logical Issue
- **File:** [RecordList.tsx](file:///c:/Users/Divya%20Sharma/Documents/DMT/dmt-sldp/frontend/apps/app/components/knowledge/RecordList.tsx)
- **Lines:** L370-L379
- **Problem:** The component filters the `records` list (fetched from API) by `activeTeam` locally using `React.useMemo`. However, the API response is likely paginated (indicated by `PaginatedDocumentsResponse` in `records-api.ts`).
- **Impact:** Users will only see filtered results from the *current page* of data, leading to incomplete/incorrect lists when navigating teams.

### MAJOR Test Regression / Mismatch
- **Pillar:** Code Quality
- **File:** [RecordEditor.test.tsx](file:///c:/Users/Divya%20Sharma/Documents/DMT/dmt-sldp/frontend/apps/app/components/knowledge/__tests__/RecordEditor.test.tsx)
- **Lines:** L156
- **Problem:** The test expects `window.alert` to be called when attempting to publish without a file in create mode. However, `RecordEditor.tsx` uses `toast.error` instead.
- **Impact:** Test suite failure. The test should be updated to mock and assert `toast.error` instead of `window.alert`.

### MAJOR Lack of Debounce on Search Input
- **Pillar:** Logical Issue
- **File:** [page.tsx](file:///c:/Users/Divya%20Sharma/Documents/DMT/dmt-sldp/frontend/apps/app/app/(dashboard)/knowledge-base/page.tsx)
- **Lines:** L147-L189
- **Problem:** `handleSearchChange` updates `searchTerm` state immediately on every keystroke without debouncing. This state flows down to `RecordList` and triggers immediate React Query API calls.
- **Impact:** Performance degradation and unnecessary API load on the backend for every character typed.

### MINOR Stale State in Effect Dependency
- **Pillar:** Logical Issue
- **File:** [page.tsx](file:///c:/Users/Divya%20Sharma/Documents/DMT/dmt-sldp/frontend/apps/app/app/(dashboard)/knowledge-base/page.tsx)
- **Lines:** L71-L79
- **Problem:** The `useEffect` for the review toast notification uses `[isManager, reviewCount > 0]` as dependencies, but references `reviewCount` in the toast body.
- **Impact:** If `reviewCount` changes while still remaining greater than zero, the toast will not update, displaying a stale count.

### MINOR Redundant State Variable
- **Pillar:** Duplication / AI Slop
- **File:** [page.tsx](file:///c:/Users/Divya%20Sharma/Documents/DMT/dmt-sldp/frontend/apps/app/app/(dashboard)/knowledge-base/page.tsx)
- **Lines:** L20
- **Problem:** `headerTitle` is managed via local state but could be derived dynamically from `activeTeam`, `activeTag`, or `isReviewActive`.
- **Impact:** Risk of state desynchronization as manual state updates are required across multiple handlers.

### MINOR Usage of `any` escape hatches
- **Pillar:** Code Quality
- **File:** [useKnowledgeRecords.ts](file:///c:/Users/Divya%20Sharma/Documents/DMT/dmt-sldp/frontend/apps/app/features/knowledge-base/hooks/useKnowledgeRecords.ts)
- **Lines:** L5
- **Problem:** Declaring `const STABLE_EMPTY_ARRAY: any[] = []` bypasses strict typing. (Similar patterns found in `useMetadata.ts` and `RecordEditor.tsx`).
- **Impact:** Loss of type safety, increasing risk of silent runtime errors.

---

No new issue classes found this session.
