# Code Review: Onboarding & Newsfeed Fixes

## Overview
Reviewing recent uncommitted changes in `fix/dmt-feedback` branch, focusing on `useNewsfeedQuery.ts`, `useComments.ts`, `StarPerformer.tsx`, and `onboarding/page.tsx`.

## Findings

### CRITICAL: Double fetch race condition on socket reconnect
- **Pillar:** Logical Issue
- **File:** [useNewsfeedQuery.ts](file:///c:/Users/Divya%20Sharma/Documents/DMT/dmt-sldp/frontend/apps/app/hooks/useNewsfeedQuery.ts#L78-L94)
- **Lines:** L78-L94
- **Problem:** The effect registers a `socket.on('open', fetchPosts)` listener AND checks `if (isConnected) { fetchPosts(); }`, while `isConnected` is included in the dependency array. On a socket reconnect, the `open` event fires, triggering `fetchPosts()`. Then, the `useWebSocket` hook updates `isConnected` to `true`, which causes the effect to re-run, hitting the `if (isConnected)` block and triggering `fetchPosts()` a second time. 
- **Impact:** Duplicate API calls / socket emissions (`get_posts`) on connection recovery, which can cause duplicate data handling or performance degradation.
- **Recommendation:** Remove the `socket.on('open', fetchPosts)` listener entirely. Relying solely on the `if (isConnected)` check within the effect (with `isConnected` in the dependency array) guarantees that `fetchPosts()` is called exactly once whenever the socket connects or reconnects.

### MAJOR: Missing error state handling in Onboarding
- **Pillar:** Logical Issue
- **File:** [page.tsx](file:///c:/Users/Divya%20Sharma/Documents/DMT/dmt-sldp/frontend/apps/app/app/(dashboard)/onboarding/page.tsx#L25-L27)
- **Lines:** L25-L27
- **Problem:** The migration to `@tanstack/react-query` via `useOnboardingQuery()` correctly handles the loading state, but it entirely drops the error handling that was present in the old `fetchOnboarding` block (which used to show `toast.error('Failed to load onboarding resources')`). The `page.tsx` component does not destructure `isError` or `error` from the query result.
- **Impact:** If the `/api/homepage/onboarding/` API call fails, the user will be left looking at an empty state or infinite loading without any context, degrading the UX.
- **Recommendation:** Extract `isError` from `useOnboardingQuery()` and either render an error UI component or trigger an error toast using `useEffect` when `isError` becomes true.

### MINOR: Clean validation check in `useComments.ts`
- **Pillar:** Code Quality
- **File:** [useComments.ts](file:///c:/Users/Divya%20Sharma/Documents/DMT/dmt-sldp/frontend/apps/app/hooks/useComments.ts#L201)
- **Lines:** L201
- **Problem:** Added `postId > 0` which correctly guards against negative or zero `postId` values before firing a fetch. This is a good preventative measure.
- **Impact:** Positive impact, prevents malformed requests.

---

*No new issue classes found this session.*
