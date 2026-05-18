# Code Review: Knowledge Base — Delete Callback & Review Sort

- **Branch:** `feature/knowledge-base`
- **Base:** `master`
- **Lens Used:** Prop Contract Integrity
- **Date:** 2026-04-28
- **Scope:** 2 files, +21 / -2 lines

---

## Changed Files

| File | Change Summary |
|---|---|
| [page.tsx](file:///media/himanshu/New%20Volume/samta/dmt-sldp/frontend/apps/app/app/%28dashboard%29/knowledge-base/page.tsx) | Passes new `onDeleteSuccess` callback to `RecordList`; clears `selectedId` when the deleted record is the one being viewed. |
| [RecordList.tsx](file:///media/himanshu/New%20Volume/samta/dmt-sldp/frontend/apps/app/components/knowledge/RecordList.tsx) | Accepts new `onDeleteSuccess` prop; invokes it from `deleteMutation.onSuccess`. Adds client-side sort to push "Under Review" documents to the top when `mine` is true. Adds `mine` to `useMemo` dependency array. |

---

## Pillar 1: Logical Issues

### [CRITICAL] Stale `onDeleteSuccess` Closure in `useMutation` Config
- **Pillar:** Logical Issue
- **File:** [RecordList.tsx](file:///media/himanshu/New%20Volume/samta/dmt-sldp/frontend/apps/app/components/knowledge/RecordList.tsx)
- **Lines:** L285–L289
- **Problem:** The `onDeleteSuccess` callback is passed as a prop and placed directly into `useMutation`'s config object:
  ```tsx
  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => knowledgeRecords.deleteDocument(id),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: RECORD_QUERY_KEYS.all });
      onDeleteSuccess?.(deletedId);  // ← captured at hook-init time
    },
  });
  ```
  `useMutation`'s `onSuccess` in the config object is bound at hook initialization. It **does not** reactively update when the `onDeleteSuccess` prop changes. This means the closure holds the initial value of `onDeleteSuccess` from the first render of `RecordList`.

  In [page.tsx](file:///media/himanshu/New%20Volume/samta/dmt-sldp/frontend/apps/app/app/%28dashboard%29/knowledge-base/page.tsx) (L282–L286), the callback closes over `selectedId`:
  ```tsx
  onDeleteSuccess={(deletedId) => {
    if (selectedId === String(deletedId)) {
      setSelectedId(null);
    }
  }}
  ```
  On first render, `selectedId` is `null`. The stale closure will always compare `null === String(deletedId)`, which is always `false`.

- **Impact:** **The detail panel will never clear after deleting the currently-viewed record.** The user deletes a record, the card disappears from the list (via query invalidation), but the detail panel stays open showing stale/404 data.

- **Fix:** Move `onDeleteSuccess` invocation to the per-call `.mutate()` callback:
  ```tsx
  // In handleDelete:
  deleteMutation.mutate(record.id, {
    onSuccess: (_, deletedId) => {
      onDeleteSuccess?.(deletedId);
    },
  });
  ```
  Per-call callbacks always use the latest closure.

### [MINOR] Client-Side Sort on Potentially Paginated Dataset
- **Pillar:** Logical Issue
- **File:** [RecordList.tsx](file:///media/himanshu/New%20Volume/samta/dmt-sldp/frontend/apps/app/components/knowledge/RecordList.tsx)
- **Lines:** L382–L390
- **Problem:** The "Under Review" sort is applied client-side inside `useMemo`. This works only because the API currently returns all records without pagination for `mine=true`.
- **Impact:** If the backend adds pagination to the `mine` endpoint, this sort will only reorder the current page. Continuation of the issue flagged in the [previous review](file:///media/himanshu/New%20Volume/samta/dmt-sldp/ai-docs/review/code-review.md).

---

## Pillar 2: Duplication / AI Slop

- [x] **No new duplication found.** The `onDeleteSuccess` prop follows the existing callback pattern used by `onTagClick` and `onSelect`.
- [x] **No dead code.** All new props are consumed.

---

## Pillar 3: Code Quality

### [MINOR] Debug `console.log` Still Present (Pre-existing)
- **Pillar:** Code Quality
- **File:** [RecordList.tsx](file:///media/himanshu/New%20Volume/samta/dmt-sldp/frontend/apps/app/components/knowledge/RecordList.tsx)
- **Lines:** L263–L265
- **Problem:** `React.useEffect(() => { if (user) console.log("Current User ID:", user.id); }, [user]);` leaks user IDs to the browser console. Not introduced in this diff but still present.
- **Impact:** Information leakage in production.

### [MINOR] Missing Success Toast on Delete
- **Pillar:** Code Quality
- **File:** [RecordList.tsx](file:///media/himanshu/New%20Volume/samta/dmt-sldp/frontend/apps/app/components/knowledge/RecordList.tsx)
- **Lines:** L287–L289
- **Problem:** The error path shows `toast.error(...)` (L293), but the success path has no toast. The user clicks "OK" on `window.confirm`, waits, and the card silently disappears.
- **Impact:** Confusing UX on slow networks — user can't distinguish between "still deleting" and "done."

---

## Pillar 4: Complexity

No new complexity issues introduced. The sort logic is simple and well-scoped within the existing `useMemo`.

---

## Dynamic Review Layer

### Rotating Lens: Prop Contract Integrity

| Prop | Component | Safe to Omit? | Verified |
|---|---|---|---|
| `onDeleteSuccess` | `RecordList` | ✅ Yes | Optional (`?`), called with `?.()` |
| `onTagClick` | `RecordList` → `RecordCard` | ✅ Yes | Optional, guarded with `?.()` |
| `mine` | `RecordList` | ✅ Yes | Optional boolean, defaults to falsy. Sort block gated by `if (mine)` |

**No prop contract violations found.**

### Open-Ended Questions

1. **What is the simplest thing that could go wrong?**
   User deletes a record while viewing its detail panel. The detail panel stays open showing the deleted record. The user clicks "Edit" → gets a 404.

2. **What does this code assume is always true?**
   - `record.id` can be compared as a string (handled correctly with `String()` coercion).
   - `mine=true` records are never paginated. Valid today, fragile tomorrow.

3. **If this was written by an AI, what would it have gotten subtly wrong?**
   Exactly the `useMutation` callback staleness. The code *looks* correct — prop flows down, callback fires, condition checks. But React Query's lifecycle means `onSuccess` in the config is a stale closure.

4. **What would break if the API returned empty or differently structured data?**
   The `(_, deletedId)` destructuring uses the `mutationFn` argument (not the response), so it's safe regardless of response shape.

5. **Is there anything solving a problem that should not exist?**
   The `onDeleteSuccess` callback is a workaround for the lack of a shared state layer. A cleaner approach: after query invalidation, the page could derive "is selected record still in the cache?" from React Query directly.

---

## Checklist Self-Update

> [!TIP]
> **New issue class proposed for Pillar 1:** `useMutation` callback staleness — Callbacks passed in the `useMutation()` config object are captured once. If they close over props or state, they go stale. Use the per-`.mutate()` callback form for dynamic values.

---

## Commit Scope Constraints

- [x] No unrelated files in the diff.
- [x] No shared package changes (`packages/*`).
- [x] No test files added or updated (consistent with prior review).

---

## Lens Rotation Log Update

| Date | Branch | Lens Used |
|---|---|---|
| 2026-04-23 | feature/apply-filters-search-pagination-userlist | (initial, none) |
| 2026-04-24 | feature/apply-filters-search-pagination-userlist | Race Conditions |
| 2026-04-27 | feature/knowledge-base | Network Failure |
| **2026-04-28** | **feature/knowledge-base** | **Prop Contract Integrity** |

---

## Summary

| Severity | Count | Key Issue |
|---|---|---|
| **CRITICAL** | 1 | `onDeleteSuccess` closure stale in `useMutation` config — detail panel never clears after delete |
| MAJOR | 0 | — |
| MINOR | 3 | Client-side sort fragility, missing success toast, debug log |

**Recommendation:** Fix the CRITICAL by moving `onDeleteSuccess` to the `.mutate()` call-site callback. Add a success toast for delete. Remove the debug `console.log`.
