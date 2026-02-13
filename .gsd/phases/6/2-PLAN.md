---
phase: 6
plan: 2
wave: 1
gap_closure: true
---

# Plan 6.2: Compliance Engine Hardening

## Objective
Extend the `ComplianceEngine` to evaluate PR merge status and CI/CD signal placeholders.

## Context
- backend/data/engine/compliance.py
- backend/data/models.py
- .gsd/milestones/v1.1-AUDIT.md

## Tasks

<task type="auto">
  <name>Harden Compliance Rules</name>
  <files>backend/data/engine/compliance.py</files>
  <action>
    - Update `check_compliance()` logic.
    - Rule 1: PR must exist (existing).
    - Rule 2: If PR exists, at least one must be `merged`.
    - Rule 3: Add placeholder for CI/CD signal check.
  </action>
  <verify>grep "merged" backend/data/engine/compliance.py</verify>
  <done>Compliance engine evaluates PR merge status as a quality gate.</done>
</task>

## Success Criteria
- [ ] Compliance status is only "Compliant" if at least one PR is merged.
- [ ] Failures correctly identify "missing_merged_pr".
