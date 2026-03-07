# TODO.md


## Sprint Comparison Page Requirements

### 1. Page Layout & Filters
- [x] Create sticky filter bar.
- [x] **Project Selector:** Dropdown to select the target project.
- [x] **Sprint A (Baseline):** Dropdown (Defaults to the *Previous Sprint*).
- [x] **Sprint B (Target):** Dropdown (Defaults to the *Current Sprint*).
- [x] **Developer Filter:** Dropdown containing all developers who participated in either sprint. Defaults to "All Developers" (Team View).

### 2. Core KPIs (The "Scorecard")
- [x] Display side-by-side metric cards at the top of the dashboard.
- [x] For every metric, show Sprint A's value, Sprint B's value, and a % Variance indicator (Green for positive change, Red for negative change).
- [x] **Velocity (Story Points Completed):** Are we delivering more or less value?
- [x] **Throughput (Total Items Completed):** Are we shipping larger chunks or smaller, faster items?
- [x] **Cycle Time (Average Days):** How fast does an item go from "In Progress" to "Done"? (A decrease is positive).
- [x] **DMT Compliance Rate (%):** Are we maintaining our quality gates and testing requirements, or are we sacrificing quality for speed?
- [x] **Defect Density:** Bugs reported/created vs. points delivered.
- [x] **PR Review Speed:** Average time to first PR review (shows collaboration health).

### 3. Graphs and Visualizations (For Leadership Analysis)
- [x] **Sprint Health Radar Chart (Spider Web):** Plot 5-6 normalized metrics (Velocity, Quality, Compliance, Cycle Time, Collaboration) for both Sprint A and Sprint B on the same chart.
- [x] **Planned vs. Completed (Side-by-Side Bar Chart):** Two sets of bars. Shows predictability. Did we finish what we committed to in Sprint A compared to Sprint B?
- [ ] **Work Type Distribution (Stacked Bar Chart or Donut):** Compare the composition of the sprints (e.g., Features vs. Bugs).
- [x] **Blocked Time Analysis:** Compare total days items spent blocked in both sprints to highlight process bottlenecks.

### 4. Developer-Level Filter Deep Dive
- [x] When a specific developer is selected from the filter, dynamically re-calculate the entire page to show only that developer's data.
- [x] **Individual KPIs:** How many points/items did they complete in Sprint A vs. Sprint B?
- [ ] **Collaboration Footprint:** PRs Authored vs. PRs Reviewed. Did they review more code in Sprint B?
- [x] **Quality Footprint:** Defects attributed directly to them; their personal DMT Compliance Rate.
