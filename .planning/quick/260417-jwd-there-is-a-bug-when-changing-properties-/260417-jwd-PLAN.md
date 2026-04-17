---
phase: quick
plan: 260417-jwd
type: execute
wave: 1
depends_on: []
files_modified:
  - src/engine/audioEngine.ts
autonomous: true
requirements: []
must_haves:
  truths:
    - "Changing a shape's color/size/animRate while stopped does not resume playback"
    - "Changing a shape's type while stopped does not resume playback"
    - "Changing any shape property while playing still works normally"
  artifacts:
    - path: "src/engine/audioEngine.ts"
      provides: "Fixed shapeStore subscriber — no getAudioContext() call that resumes a suspended context"
  key_links:
    - from: "shapeStore.subscribe callback"
      to: "audioCtx (module-level variable)"
      via: "direct null check, not getAudioContext()"
      pattern: "const ctx = audioCtx"
---

<objective>
Fix the bug where changing any shape property (color, size, animRate, or type) while
the sequencer is stopped causes the AudioContext to resume, restarting audio playback.

Purpose: The playback stop/start state must be respected at all times. Property edits in
the side panel should be silent updates when stopped, and live updates when playing.

Output: `src/engine/audioEngine.ts` with two targeted fixes.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@src/engine/audioEngine.ts
@src/store/playbackStore.ts
</context>

<background>
Root cause analysis:

**Bug 1 (primary) — line 357 of audioEngine.ts:**
`shapeStore.subscribe` calls `getAudioContext()` unconditionally at the top of
every subscription fire. `getAudioContext()` always calls `audioCtx.resume()` when
the context is in a `suspended` state (lines 117-119). This means any shape property
change (color, size, animRate, type) while the user has pressed Stop will immediately
resume the AudioContext and restart sound.

**Bug 2 (secondary) — setTimeout createVoice call (~line 403):**
The type-change path, after a 60 ms delay, calls `createVoice(shapeSnapshot)`.
`createVoice` also calls `getAudioContext()` — same resume side-effect. If the context
was stopped between the type change and the 60 ms callback, the voice recreate wakes it.

The correct pattern is already used in:
- `recreateLfo()` — uses `const ctx = audioCtx` (direct, no resume)
- `unsubscribePlayback` handler — uses `const ctx = audioCtx` (direct, no resume)
</background>

<tasks>

<task type="auto">
  <name>Task 1: Fix getAudioContext() calls in shapeStore subscriber</name>
  <files>src/engine/audioEngine.ts</files>
  <action>
Two targeted changes in `initAudioEngine`'s `shapeStore.subscribe` callback:

**Fix 1 — Replace getAudioContext() with direct audioCtx read (line ~357):**

Current:
```typescript
const ctx = getAudioContext()  // may be null in jsdom
```

Replace with:
```typescript
const ctx = audioCtx  // direct null check — do NOT use getAudioContext() here;
// getAudioContext() resumes a suspended context, overriding the user's Stop action.
// Voices are still created correctly: createVoice() calls getAudioContext() itself,
// which is fine for new additions (user just clicked a cell = user gesture).
```

The "Detect additions" block (shape not in voices yet) should remain calling
`createVoice(shape)` directly — `createVoice` calls `getAudioContext()` and that is
correct because a new shape is always created via a user click gesture.

The "Detect property changes" block uses `ctx` only for scheduling AudioParam ramps
(`setTargetAtTime`). Those are safe on a suspended context; the scheduled values
are buffered and play when context resumes — no resume side-effect needed here.

**Fix 2 — Guard the type-change setTimeout recreate against suspended context:**

Inside the `setTimeout` callback for type changes, before calling `createVoice`,
check that the context is still running (not suspended). If stopped, skip re-creation;
the voice has been torn down and will simply not exist until playback resumes or the
user makes another gesture.

Current (inside setTimeout, ~line 402-404):
```typescript
voices.delete(idToRecreate)
createVoice(shapeSnapshot)  // re-create with new type's waveform
prevShapes.set(idToRecreate, shapeSnapshot)
```

Replace with:
```typescript
voices.delete(idToRecreate)
// Only recreate if context is running — do NOT call createVoice when suspended;
// createVoice() calls getAudioContext() which resumes the context, overriding Stop.
// The voice will be absent until the user resumes playback; that is acceptable.
if (audioCtx && audioCtx.state === 'running') {
  createVoice(shapeSnapshot)
}
prevShapes.set(idToRecreate, shapeSnapshot)
```

No other changes. Do not alter `createVoice`, `getAudioContext`, or any other function.
  </action>
  <verify>
    <automated>npx vitest run src/engine/audioEngine.test.ts</automated>
  </verify>
  <done>
  - All existing audioEngine tests pass.
  - The shapeStore subscriber no longer calls getAudioContext() at its top level.
  - The type-change recreate path guards against suspended context.
  - Both fixes use the `audioCtx` module-level variable directly (same pattern as recreateLfo).
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| UI → audioEngine | Shape property changes come from user input in CellPanel; values are pre-validated by shapeStore |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-quick-01 | Denial of Service | AudioContext resume | mitigate | This fix — prevent unintended resume on property change |
</threat_model>

<verification>
1. Open the app, place a shape on the grid (audio starts).
2. Press Stop in PlaybackControls.
3. Click the shape to open CellPanel.
4. Adjust color sliders, size slider, animRate, or shape type.
5. Confirm: no sound plays, the context remains suspended.
6. Press Play.
7. Confirm: audio resumes correctly with updated shape properties applied.
</verification>

<success_criteria>
Changing any shape property while the sequencer is stopped produces no audio output.
Playback only resumes when the user explicitly presses Play.
All existing automated tests continue to pass.
</success_criteria>

<output>
After completion, create `.planning/quick/260417-jwd-there-is-a-bug-when-changing-properties-/260417-jwd-SUMMARY.md`
</output>
