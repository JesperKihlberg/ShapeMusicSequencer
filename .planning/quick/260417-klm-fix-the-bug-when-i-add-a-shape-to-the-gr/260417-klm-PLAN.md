---
phase: quick
plan: 260417-klm
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/CanvasContainer.tsx
  - src/components/CanvasContainer.test.tsx
autonomous: true
requirements: []

must_haves:
  truths:
    - "Pressing Backspace inside the BPM input does not delete the selected shape"
    - "Pressing Delete inside any text input does not delete the selected shape"
    - "Pressing Backspace/Delete on the canvas (no input focused) still removes the selected shape"
  artifacts:
    - path: "src/components/CanvasContainer.tsx"
      provides: "Keyboard handler guarded against input-element events"
  key_links:
    - from: "CanvasContainer.tsx handleKeyDown"
      to: "shapeStore.removeShape"
      via: "document keydown — only when target is NOT an input element"
---

<objective>
Fix the bug where pressing Backspace while editing the BPM (or any other input field) deletes the selected shape from the grid.

Purpose: The global `keydown` handler in CanvasContainer does not check whether the event originated from an input/textarea/select/contenteditable element. When a user selects a canvas cell, then clicks the BPM input and presses Backspace to edit the value, the handler fires and calls `removeShape` on the selected cell — clearing the shape from the grid.

Output: CanvasContainer.tsx with a target-element guard in `handleKeyDown`; updated test for this case.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/components/CanvasContainer.tsx
@src/components/CanvasContainer.test.tsx
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Guard handleKeyDown against input-element focus</name>
  <files>src/components/CanvasContainer.tsx, src/components/CanvasContainer.test.tsx</files>
  <behavior>
    - Test 1: Backspace on document while a cell is selected and target is a canvas/div removes the shape
    - Test 2: Backspace on document while a cell is selected and target is an INPUT element — no removeShape call, shape preserved
    - Test 3: Delete on document while a cell is selected and target is a TEXTAREA element — no removeShape call
    - Test 4: Escape while target is an INPUT element — no setSelectedCell(null) call (leave selection alone; input manages its own keyboard)
  </behavior>
  <action>
In `src/components/CanvasContainer.tsx`, inside the `handleKeyDown` function (in the `useEffect` that registers the `document` keydown listener), add an early-return guard as the very first statement of the function:

```typescript
// Guard: ignore keyboard shortcuts when focus is on a form element.
// Prevents Backspace in BPM input from deleting the selected shape.
const target = e.target as HTMLElement
if (
  target instanceof HTMLInputElement ||
  target instanceof HTMLTextAreaElement ||
  target instanceof HTMLSelectElement ||
  target.isContentEditable
) {
  return
}
```

Place this guard BEFORE the `if (!selected) return` check. No other changes to the function logic.

In `src/components/CanvasContainer.test.tsx`, add tests covering:
1. Backspace with a non-input target (canvas element) → removeShape IS called
2. Backspace with an HTMLInputElement as target → removeShape NOT called
3. Delete with an HTMLTextAreaElement as target → removeShape NOT called
4. Escape with an HTMLInputElement as target → setSelectedCell NOT called

Use the existing test patterns already present in CanvasContainer.test.tsx. Mock `shapeStore` and `selectionStore` as the existing tests do.
  </action>
  <verify>
    <automated>npx vitest run src/components/CanvasContainer.test.tsx</automated>
  </verify>
  <done>
    All CanvasContainer tests pass. Pressing Backspace on an input does not trigger removeShape. Pressing Backspace without input focus still triggers removeShape. TypeScript compiles without errors (npx tsc --noEmit).
  </done>
</task>

</tasks>

<verification>
1. `npx vitest run src/components/CanvasContainer.test.tsx` — all tests pass (including new guard tests)
2. `npx tsc --noEmit` — no TypeScript errors
3. Manual smoke test: add a shape → select it → click BPM input → press Backspace → shape still on grid
4. Manual smoke test: add a shape → select it → press Backspace on canvas → shape is removed
</verification>

<success_criteria>
- Backspace/Delete in BPM input (or any other input, textarea, select, contenteditable) while a cell is selected does NOT remove the shape
- Backspace/Delete with keyboard focus on the canvas or body still removes the selected shape
- All existing CanvasContainer tests continue to pass
- No TypeScript compile errors
</success_criteria>

<output>
After completion, create `.planning/quick/260417-klm-fix-the-bug-when-i-add-a-shape-to-the-gr/260417-klm-SUMMARY.md`
</output>
