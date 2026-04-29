---
phase: quick-260429-gxf
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/CellPanel.tsx
autonomous: true
requirements:
  - bug-fix: re-apply clean mode bypass after shape type change destroys/recreates voice

must_haves:
  truths:
    - "When cleanMode is true and the user changes shape type, the new voice is still in clean (bypass) mode"
    - "When cleanMode is false and the user changes shape type, the new voice has normal distortion"
    - "Changing the selected cell still resets cleanMode to false"
  artifacts:
    - path: "src/components/CellPanel.tsx"
      provides: "useEffect that re-applies bypass after shape type change"
      contains: "useEffect.*shape.*type"
  key_links:
    - from: "src/components/CellPanel.tsx (useEffect on shape.type)"
      to: "audioEngine.setVoiceDistortionBypass"
      via: "80ms setTimeout — longer than the engine's 60ms destroy/recreate window"
      pattern: "setTimeout.*setVoiceDistortionBypass"
---

<objective>
Re-apply the clean mode distortion bypass to the freshly-created voice when a shape's type
changes in CellPanel.

Purpose: The audio engine destroys and recreates the AudioVoice after a 60ms ramp-out when
shape type changes. The existing cleanMode React state survives this recreate, but
setVoiceDistortionBypass was called on the now-dead voice. This leaves the new voice with
full distortion even though the toggle is visually "on".

Output: A useEffect in CellPanel that depends on [shape?.type, shape?.id] and, when cleanMode
is true, schedules setVoiceDistortionBypass(shape.id, true, …) at 80ms (after the engine's
60ms window) to stamp the bypass onto the new voice.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/components/CellPanel.tsx
@src/engine/audioEngine.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add useEffect to re-apply clean mode bypass after shape type change</name>
  <files>src/components/CellPanel.tsx</files>
  <action>
In CellPanel.tsx, add a cleanMode ref and a new useEffect:

1. Below the `const [cleanMode, setCleanMode] = useState(false)` line, add:
   ```
   const cleanModeRef = useRef(false)
   ```
   Keep cleanModeRef in sync inside handleCleanToggle:
   ```
   cleanModeRef.current = next
   setCleanMode(next)
   ```
   Also reset it alongside setState in the existing shape?.id effect:
   ```
   cleanModeRef.current = false
   setCleanMode(false)
   ```

2. Add a NEW useEffect that fires on shape type change (place it after the shape?.id effect):
   ```tsx
   useEffect(() => {
     if (!shape) return
     if (!cleanModeRef.current) return
     // Engine destroys old voice and recreates it after ~60ms.
     // We must wait longer (80ms) so the new AudioVoice exists in the voices map.
     const id = shape.id
     const s = shape.color.s
     const l = shape.color.l
     const timer = setTimeout(() => {
       setVoiceDistortionBypass(id, true, s, l)
     }, 80)
     return () => clearTimeout(timer)
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [shape?.type, shape?.id])
   ```

   The dependency array uses both `shape?.type` AND `shape?.id` so the effect fires on either
   a type change (same id, new type) or a cell switch (which the shape?.id effect already
   handles by resetting cleanMode — but having it here too is harmless since cleanModeRef.current
   will be false at that point and the early return guards it).

   Read cleanModeRef.current inside the callback (not captured at effect-fire time) so it
   reflects the value at 80ms. Capture shape.id, color.s, color.l as local variables before
   the timeout to avoid stale-closure access to `shape` after the effect might have torn down.

   Do NOT depend on `cleanMode` state in the dep array — that would create an infinite loop
   (setVoiceDistortionBypass has no effect if called repeatedly with the same args, but the
   extra renders are wasteful). The ref is the correct pattern here.
  </action>
  <verify>
    <automated>npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <done>
    TypeScript compiles clean. When cleanMode is active and user changes shape type, the
    new voice has bypass applied ~80ms after the change (audibly clean). When cleanMode is
    off, type change produces normal distorted output. Cell switch still resets cleanMode to
    false as before.
  </done>
</task>

</tasks>

<verification>
Manual smoke test:
1. Add a shape, start playback.
2. Click "Clean" — waveform goes clean.
3. Change shape type (e.g. circle → square) — voice should remain clean (no distortion re-appearing after the brief transition).
4. Click "Clean" again to turn it off — distortion should return.
5. Change shape type again — voice should have distortion (cleanMode was off).
6. Switch to a different cell and back — cleanMode button should be off, distortion active.
</verification>

<success_criteria>
- Shape type change while cleanMode=true leaves the new voice in bypass state (audibly clean).
- Shape type change while cleanMode=false leaves the new voice with normal distortion.
- Cell switch correctly resets cleanMode to off.
- No TypeScript errors.
- No React hook rule violations.
</success_criteria>

<output>
After completion, create `.planning/quick/260429-gxf-re-apply-clean-mode-after-shape-type-cha/260429-gxf-SUMMARY.md`
</output>
