---
phase: 3
plan: 1
wave: 1
---

# Plan 3.1: DMT Rule Engine & Compliance Logic

## Objective
Implement the logic that determines if a WorkItem is compliant with "Done Means Tested" standards.

## Tasks
<task type="auto">
  <name>Implement Rule Framework</name>
  <files>
    - backend/data/engine/rules.py
    - backend/data/engine/compliance.py
  </files>
  <action>Create BaseRule and implement initial rules (PRExists, StatusMatch).</action>
  <verify>Run a standalone test script evaluating a WorkItem against these rules.</verify>
  <done>Engine can evaluate and mark items as compliant/non-compliant.</done>
</task>

<task type="auto">
  <name>Integrate with ETL Pipeline</name>
  <files>
    - backend/data/tasks.py
  </files>
  <action>Add a post-sync step to trigger the compliance engine for updated items.</action>
  <verify>Verify 'is_compliant' changes after a mock sync.</verify>
  <done>ETL pipeline automatically triggers DMT checks.</done>
</task>

## Verification
- Unit tests for individual rules.
- Integration test for automated compliance marking.
