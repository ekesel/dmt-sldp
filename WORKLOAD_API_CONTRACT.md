# Workload: Frontend Work and API Contract

Backend for capacity-based workload is ready. This file lists what the frontend needs to build and the exact APIs to use.

## How it works (one paragraph)

Each developer gets a **capacity** = Level weight × Project allocation %.
Their **ideal range** of items per sprint = `Min × capacity` to `Max × capacity` (the Team card adds up the last 5 sprints).
More items than the range = **Overloaded**, inside = **Balanced**, fewer = **Underutilised**.
Level weights and Min/Max are set in **Company Baseline**, a developer's level is set on the **user**, and allocation comes from **Resource Allocation** (no change there).
Every level and settings change has an **Effective from** date: each sprint uses the values in effect on its start date, so past sprints never change.

The backend does all the calculation. The frontend only shows the values and saves the forms.

## Frontend tasks

| # | Screen | What to build |
|---|---|---|
| 1 | Admin portal → Company Baseline | **Workload Settings** section (superadmin only): Junior / Mid / Senior weight, Min and Max items per sprint, Effective from date |
| 2 | Admin portal → Users (create / edit) | **Level** dropdown (Junior / Mid / Senior) + **Effective from** date. Hide on the user's own profile |
| 3 | Team Workload card | Show each member's **level** (Junior / Mid / Senior) next to their name, plus `workload_status` and ideal range from the API; remove the old frontend formula |
| 4 | Individual Workload | Show `workload.status` and ideal range from the API |
| 5 | Team Workload card + Individual Workload | **Warnings banner** from the warnings API |
| 6 | Workload help text | Update to the formula above |

Optional, not needed now: history lists for levels and settings (APIs already exist, see the end of this file).

---

## 1. Workload Settings (Company Baseline)

### GET `/api/admin/company-baseline/`

```json
{
  "status_code": 200,
  "message": "success",
  "data": {
    "kpis": { "...": "unchanged" },
    "workload_settings": {
      "seniority_weights": { "junior": 0.7, "mid": 1.0, "senior": 1.3 },
      "per_sprint_limits": { "under": 3, "over": 6 },
      "sprint_window": 5,
      "use_allocation": true,
      "min_allocation": 10,
      "count_subtasks": false,
      "use_percentile": false,
      "overload_percentile": 80,
      "underutil_percentile": 40,
      "small_team_min": 3
    },
    "workload_settings_history": [
      { "effective_from": "2000-01-01", "settings": { "...": "same shape as workload_settings" } }
    ]
  }
}
```

- `workload_settings` = the values in effect **today**. Fill the form from this.
- `per_sprint_limits.under` = **Min**, `per_sprint_limits.over` = **Max**.
- The form only needs `seniority_weights` and `per_sprint_limits`. Other keys can stay hidden.

### POST `/api/admin/company-baseline/`

Send only what changed; missing keys keep their current values.

```json
{
  "workload_settings": {
    "seniority_weights": { "junior": 0.7, "mid": 1.0, "senior": 1.3 },
    "per_sprint_limits": { "under": 3, "over": 6 }
  },
  "workload_settings_effective_from": "2026-11-01"
}
```

- `workload_settings_effective_from`: `YYYY-MM-DD`, optional, default today. Can be in the past or the future.
- Saving again on the same date overwrites that date's values (use this to fix a mistake).
- Response: same shape as GET.

**Validation (show the message on the form):**

| Rule | Response |
|---|---|
| Not a superadmin | `403` `{ "status_code": 403, "message": "Only superadmins can change workload settings." }` |
| Weight not between 0.1 and 100 | `400` |
| Min or Max not between 0 and 100 | `400` |
| Min ≥ Max | `400` |
| Unknown key or wrong type | `400` |
| Date not `YYYY-MM-DD` | `400` |
| Date sent without `workload_settings` | `400` |

400 shape:

```json
{ "status_code": 400, "message": "error", "data": { "non_field_errors": ["per_sprint_limits.under must be below over."] } }
```

A bad date comes back as `data.effective_from`. Show `data` messages as they are.

---

## 2. Developer Level (Users)

### PATCH `/api/admin/users/<id>/` (also POST `/api/admin/users/` on create)

```json
{ "seniority": "senior", "seniority_effective_from": "2026-11-01" }
```

- `seniority`: `"junior"`, `"mid"` or `"senior"`. `null` = not set (counted as Mid).
- `seniority_effective_from`: `YYYY-MM-DD`, optional, default today.
- The user response has `seniority` = the level in effect **today** (a future-dated level shows only once its date arrives).

**Who can change it:** superadmin, platform admin, or manager. A manager **cannot change their own level**, so hide the field on the user's own profile.

**Validation:**

| Rule | Response |
|---|---|
| Not allowed (normal user, or manager on themselves) | `400` `{ "seniority": ["Only managers or admins can change seniority, and not their own."] }` |
| Invalid level value | `400` `{ "seniority": ["..."] }` |
| `seniority_effective_from` sent without `seniority` | `400` `{ "seniority_effective_from": ["Send it together with seniority."] }` |

---

## 3. Team Workload card

### GET `/api/dashboard/assignee-distribution/?project_id=<id>`

Same endpoint as today, with new fields per row. Omit `project_id` for All Projects. `start_date`, `end_date`, `sprint_ids` work as before.

```json
[
  {
    "id": 12,
    "name": "Ekansh",
    "email": "ekansh@samta.ai",
    "is_portal_user": true,
    "total": 29,
    "in_progress": 3,
    "completed": 24,
    "todo": 2,
    "avg_cycle_time_days": 2.4,
    "seniority": "senior",
    "capacity": 1.3,
    "ideal_min": 20,
    "ideal_max": 38,
    "workload_status": "Balanced",
    "percentile": 62.5,
    "effective_load": 22.31
  }
]
```

| Field | Show as |
|---|---|
| `workload_status` | `"Overloaded"`, `"Balanced"` or `"Underutilised"`. `null` if the person has 0 items |
| `ideal_min` – `ideal_max` | "Ideal: 20–38 items" for the whole window (last 5 sprints by default) |
| `total` | Items assigned in the window, compare with the ideal range |
| `seniority` | **Level badge next to the member's name**: `"junior"` → Junior, `"mid"` → Mid, `"senior"` → Senior. It is the level in effect today; `"mid"` when not set (the warnings banner lists people without a level) |
| `capacity` | Average capacity per sprint (level weight × allocation) |
| `percentile` | Rank in the team only, not the status |

Rows with 0 items have no `capacity`, `ideal_min` or `ideal_max`.

---

## 4. Individual Workload

Existing endpoints, each sprint row (or the response) has a `workload` object:

- `GET /api/developers/<id>/metrics/?project_id=<id>`: each row in the list
- `GET /api/developers/<id>/comparison/?project_id=<id>`: the response

```json
"workload": {
  "total": 6,
  "in_progress": 2,
  "completed": 3,
  "todo": 1,
  "status": "Overloaded",
  "percentile": 81.25,
  "effective_load": 6.0,
  "capacity": 1.0,
  "ideal_min": 3,
  "ideal_max": 5
}
```

- Show `status` and "Ideal: `ideal_min`–`ideal_max` items" for that sprint.
- `workload` can be `null` (row without a sprint), and when there is no sprint data it only has `total`, `in_progress`, `completed`, `todo`, `status`. Handle missing fields.

---

## 5. Warnings banner

### GET `/api/dashboard/workload-warnings/?project_id=<id>`

Omit `project_id` for All Projects. Call it next to the Team Workload card and the Individual Workload screen.

```json
{
  "warnings": [
    {
      "code": "allocation_not_published",
      "message": "Allocation sheet for November 2026 is not completed. Workload may be affected. Please complete and publish it from Resource Allocation."
    }
  ]
}
```

- Show each `message` as a warning banner. Empty list = no banner.
- Messages are ready to show; do not build text on the frontend.
- `400` `{ "error": "project_id must be a number." }` for a bad `project_id`.

| `code` | When | Optional link |
|---|---|---|
| `settings_not_set` | Workload settings never saved, defaults used | Company Baseline |
| `allocation_not_published` | This month's allocation sheet not published | Resource Allocation |
| `level_not_set` | Some people in the current sprint have no level (counted as Mid) | Users |
| `allocation_not_set` | Some people have no allocation on this project this month (counted as 100%) | Resource Allocation |
| `no_sprint_data` | No data for the current sprint | — |

---

## Optional (not needed now): history

| What | API |
|---|---|
| Level history of a user | `GET /api/admin/users/<id>/seniority-history/` → `[{ "id", "seniority", "effective_from", "created_by_email", "created_at" }]` |
| Delete a wrong level entry | `DELETE /api/admin/users/<id>/seniority-history/?effective_from=YYYY-MM-DD` |
| Settings versions | `workload_settings_history` in the Company Baseline GET |
| Delete a wrong settings version (superadmin) | `DELETE /api/admin/company-baseline/?workload_settings_effective_from=YYYY-MM-DD` |

## Notes

- All URLs end with `/` (the backend does not add it).
- Add the new calls to `@dmt/api`, not axios directly in components.
- Until levels and settings are filled in, everyone is counted as Mid with default settings; the warnings banner tells admins what is missing.
