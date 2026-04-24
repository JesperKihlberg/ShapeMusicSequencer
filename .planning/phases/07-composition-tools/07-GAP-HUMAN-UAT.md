---
status: deferred
phase: 07-composition-tools
source: [07-VERIFICATION.md, 07-FIX-01-PLAN.md]
started: 2026-04-24T10:10:00Z
updated: 2026-04-24T10:10:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. UAT Test 7 re-run — Shape freezes at animated size on Stop
expected: |
  Add a shape, open the animation panel, add a size curve. Press Start — the
  shape animates (pulsing size). Press Stop — the shape must hold its current
  animated visual size, NOT snap back to the base shape.size value.
result: [pending]

### 2. UAT Test 1 regression — Shape with no size curve unaffected
expected: |
  Add a shape with NO size curve. Press Start and Stop multiple times. The shape
  must render at its base size throughout — no unexpected size change.
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
