---
phase: 17
plan: fix-regressions
wave: 1
gap_closure: true
---

# Fix: Regression Smoke Test (Next.js 16)

## Problem
The upgrade to `next@16.1.6` was a significant jump from `14.2.x`. There is a risk of disruption to Tailwind glassmorphism styles or Recharts visualizations.

## Root Cause
Emergency security update forced a major version bump.

## Tasks

<task type="auto">
  <name>Verify Portal Stability</name>
  <files>
    <file>frontend/apps/admin/package.json</file>
    <file>frontend/apps/app/package.json</file>
  </files>
  <action>
    1. Run `npm run dev` for both portals.
    2. Visually inspect glassmorphism effects and chart rendering.
  </action>
  <verify>Check browser tool screenshots of dashboard and admin list.</verify>
  <done>Portals render correctly on Next.js 16 without visual regressions.</done>
</task>
