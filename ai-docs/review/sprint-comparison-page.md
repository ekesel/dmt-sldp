# Code Review: SprintComparisonPage.tsx

## Pillar 1: Logical Issues

### [MAJOR] Missing cleanup in async Effects
- **Pillar:** Logical Issue
- **File:** [page.tsx](file:///c:/Users/Divya%20Sharma/Documents/DMT/dmt-sldp/frontend/apps/app/app/(dashboard)/sprint-comparison/page.tsx)
- **Lines:** L34-36, L41-45, L54-61
- **Problem:** API calls and dynamic imports inside `useEffect` do not return cleanup functions.
- **Impact:** Can trigger state updates on unmounted components, causing "memory leak" warnings and potential race conditions if the component is rapidly unmounted/remounted.

### [MAJOR] Stale sprint names when project changes
- **Pillar:** Logical Issue
- **File:** [page.tsx](file:///c:/Users/Divya%20Sharma/Documents/DMT/dmt-sldp/frontend/apps/app/app/(dashboard)/sprint-comparison/page.tsx)
- **Lines:** L47-52
- **Problem:** When `projectId` changes, `sprintAId` and `sprintBId` are reset to `null` (L71), but `sprintAName` and `sprintBName` are only updated if `find` returns a match. Since `sprintAId` is null, the match fails and the old names persist.
- **Impact:** The comparison API (L57) might be triggered with names from a previous project if the IDs are null but names are stale, or the UI might show incorrect names in the KPI descriptions.

## Pillar 2: Duplication / AI Slop

### [MINOR] Extensive use of `any` types
- **Pillar:** Code Quality
- **File:** [page.tsx](file:///c:/Users/Divya%20Sharma/Documents/DMT/dmt-sldp/frontend/apps/app/app/(dashboard)/sprint-comparison/page.tsx)
- **Lines:** L21, L23, L39, L120, L228
- **Problem:** Data structures are typed as `any`, bypassing TypeScript safety.
- **Impact:** Increases risk of runtime crashes (e.g., `data.kpis` being undefined) and makes refactoring difficult.

## Pillar 3: Code Quality

### [MINOR] Inline callbacks in heavy components
- **Pillar:** Code Quality
- **File:** [page.tsx](file:///c:/Users/Divya%20Sharma/Documents/DMT/dmt-sldp/frontend/apps/app/app/(dashboard)/sprint-comparison/page.tsx)
- **Lines:** L71, L92, L220
- **Problem:** Handlers like `onSelect` and `onClose` are defined as inline arrow functions.
- **Impact:** Causes unnecessary re-renders of child components (`ProjectSelector`, `HelpSidebar`) on every parent render.

## Pillar 4: Complexity

### [MINOR] Logic nested in JSX
- **Pillar:** Complexity
- **File:** [page.tsx](file:///c:/Users/Divya%20Sharma/Documents/DMT/dmt-sldp/frontend/apps/app/app/(dashboard)/sprint-comparison/page.tsx)
- **Lines:** L124-130
- **Problem:** Formatting logic for `displayValue` and `baseValue` is mixed into the `map` function inside JSX.
- **Impact:** Reduces readability of the render block. Should be extracted into a helper or a dedicated component.

---

## Dynamic Review Layer

### Lens: Network Failure
- **Question:** What happens if the comparison API fails?
- **Finding:** The error is logged to console (L59), but `loading` is set to `false` (L60) and `data` remains `null`. The UI will then show "Comparison Pending" (L104) or a blank state instead of an error message.
- **Severity:** [MAJOR] - Users won't know why the data isn't loading.

### Open-Ended Questions
1. **What is the simplest thing that could go wrong here?**
   - Selecting two sprints from different projects (if the dropdowns aren't properly filtered). The `SprintSelector` seems to take `projectId`, so it should be fine, but the state reset logic (L71) is critical.
2. **What does this code assume is always true?**
   - Assumes `data.kpis` and `data.charts` are always present in the response if `res` is returned.
   - Assumes `sprintAName` and `sprintBName` are sufficient identifiers for the backend comparison (IDs would be better).

---

## Checklist Self-Update
- No new issue classes found this session.
