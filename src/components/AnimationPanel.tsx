// src/components/AnimationPanel.tsx
// Bottom animation panel with draggable resize handle (ANIM-05, ANIM-06).
// Receives panelHeight and onHeightChange from App.tsx to allow CellPanel
// to restore the panel to 180px when the user clicks "Animate" (D-12).
import { useState, useRef, useCallback, useEffect } from 'react'
import { useAnimationStore, animationStore } from '../store/animationStore'
import { useSelectionStore } from '../store/selectionStore'
import { useShapeStore } from '../store/shapeStore'
import { playbackStore, usePlaybackStore } from '../store/playbackStore'
import { getCurrentBeat } from '../engine/beatClock'
import type { AnimatableProperty, SplineCurve, SplinePoint } from '../store/animationStore'
import { uiStore, useUiStore } from '../store/uiStore'

const PANEL_MIN = 40    // px — only handle visible when collapsed
const PANEL_DEFAULT = 188  // px — 8 handle + 36 header + 144 lanes
const PANEL_MAX_RATIO = 0.5  // 50% of viewport height
const PROPERTIES: AnimatableProperty[] = ['size', 'hue', 'saturation', 'lightness']
// Stable empty-curves sentinel — must be module-level so selector returns the same reference
// on every render when a shape has no curves (avoids infinite re-render loop in Zustand)
const EMPTY_CURVES = {} as const

interface AnimationPanelProps {
  panelHeight: number
  onHeightChange: (h: number) => void
}

export function AnimationPanel({ panelHeight, onHeightChange }: AnimationPanelProps) {
  // Selected shape lookup — reactive via useShapeStore
  const selectedCell = useSelectionStore((s) => s.selectedCell)
  const shape = useShapeStore(useCallback(
    (state) => selectedCell
      ? state.shapes.find(s => s.col === selectedCell.col && s.row === selectedCell.row)
      : undefined,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedCell?.col, selectedCell?.row]
  ))

  // Curves for selected shape — uses module-level EMPTY_CURVES sentinel for stable reference
  const shapeCurves = useAnimationStore((s) =>
    shape ? (s.curves[shape.id] ?? EMPTY_CURVES) : EMPTY_CURVES
  )

  // Drag handle logic (UI-SPEC Section 2a, Pitfall 3)
  const isDragging = useRef(false)
  const dragStartY = useRef(0)
  const dragStartHeight = useRef(0)

  // Ref map: property → canvas element — populated by AnimLane registration callbacks (D-02)
  const laneCanvasRefs = useRef<Map<AnimatableProperty, HTMLCanvasElement>>(new Map())

  // Stable callback so AnimLane useEffect deps don't fire on every render
  const handleCanvasRef = useCallback(
    (property: AnimatableProperty, el: HTMLCanvasElement | null) => {
      if (el) {
        laneCanvasRefs.current.set(property, el)
      } else {
        laneCanvasRefs.current.delete(property)
      }
    },
    []
  )

  // Read isPlaying via React hook so useEffect re-runs on transition (D-04)
  const isPlaying = usePlaybackStore((s) => s.isPlaying)

  // Read zoomBeats from uiStore — global visible beat span (ANIM-08, D-06)
  const zoomBeats = useUiStore((s) => s.zoomBeats)

  // RAF loop — redraws all lane canvases every frame while playing (D-02, D-03, D-04)
  useEffect(() => {
    let rafId: number

    function tick() {
      const { bpm } = playbackStore.getState()
      const beat = getCurrentBeat(bpm)
      const currentZoom = uiStore.getState().zoomBeats

      for (const [prop, canvas] of laneCanvasRefs.current.entries()) {
        const ctx = canvas.getContext('2d')
        if (!ctx) continue
        const curve = animationStore.getState().curves[shape?.id ?? '']?.[prop]
        if (!curve) continue

        // Primary draw — uses zoomBeats for X-axis scaling (D-07)
        drawLaneCanvas(ctx, canvas.width, canvas.height, curve, prop, selectedPointsRef.current[prop] ?? null, beat, currentZoom)

        // Ghost passes (ANIM-09, D-08, D-09)
        const primaryWidthPx = (curve.duration / currentZoom) * canvas.width
        const repeatCount = Math.floor(currentZoom / curve.duration) - 1

        // Full ghost copies
        for (let i = 1; i <= repeatCount; i++) {
          const ghostStartPx = (i * curve.duration / currentZoom) * canvas.width
          ctx.save()
          ctx.globalAlpha = 0.30
          ctx.beginPath()
          ctx.rect(ghostStartPx, 0, primaryWidthPx, canvas.height)
          ctx.clip()
          ctx.translate(ghostStartPx, 0)
          drawLaneCanvas(ctx, primaryWidthPx, canvas.height, curve, prop, null, undefined, undefined)
          ctx.restore()
        }

        // Partial ghost at right edge when zoomBeats % curve.duration !== 0
        const remainder = currentZoom % curve.duration
        if (remainder > 0 && repeatCount >= 0) {
          const partialStartPx = Math.floor(currentZoom / curve.duration) * curve.duration / currentZoom * canvas.width
          const partialWidthPx = (remainder / currentZoom) * canvas.width
          ctx.save()
          ctx.globalAlpha = 0.30
          ctx.beginPath()
          ctx.rect(partialStartPx, 0, partialWidthPx, canvas.height)
          ctx.clip()
          ctx.translate(partialStartPx, 0)
          drawLaneCanvas(ctx, primaryWidthPx, canvas.height, curve, prop, null, undefined, undefined)
          ctx.restore()
        }
      }

      rafId = requestAnimationFrame(tick)
    }

    if (isPlaying) {
      // Start RAF loop
      rafId = requestAnimationFrame(tick)
    } else {
      // Stopped: draw each lane once at beat 0 (D-04, D-05)
      for (const [prop, canvas] of laneCanvasRefs.current.entries()) {
        const ctx = canvas.getContext('2d')
        if (!ctx) continue
        const curve = animationStore.getState().curves[shape?.id ?? '']?.[prop]
        if (!curve) continue

        // Primary draw with current zoom (D-07)
        drawLaneCanvas(ctx, canvas.width, canvas.height, curve, prop, null, 0, zoomBeats)

        // Ghost passes (ANIM-09, D-08, D-09)
        const primaryWidthPx = (curve.duration / zoomBeats) * canvas.width
        const repeatCount = Math.floor(zoomBeats / curve.duration) - 1

        // Full ghost copies
        for (let i = 1; i <= repeatCount; i++) {
          const ghostStartPx = (i * curve.duration / zoomBeats) * canvas.width
          ctx.save()
          ctx.globalAlpha = 0.30
          ctx.beginPath()
          ctx.rect(ghostStartPx, 0, primaryWidthPx, canvas.height)
          ctx.clip()
          ctx.translate(ghostStartPx, 0)
          drawLaneCanvas(ctx, primaryWidthPx, canvas.height, curve, prop, null, undefined, undefined)
          ctx.restore()
        }

        // Partial ghost at right edge when zoomBeats % curve.duration !== 0
        const remainder = zoomBeats % curve.duration
        if (remainder > 0 && repeatCount >= 0) {
          const partialStartPx = Math.floor(zoomBeats / curve.duration) * curve.duration / zoomBeats * canvas.width
          const partialWidthPx = (remainder / zoomBeats) * canvas.width
          ctx.save()
          ctx.globalAlpha = 0.30
          ctx.beginPath()
          ctx.rect(partialStartPx, 0, partialWidthPx, canvas.height)
          ctx.clip()
          ctx.translate(partialStartPx, 0)
          drawLaneCanvas(ctx, primaryWidthPx, canvas.height, curve, prop, null, undefined, undefined)
          ctx.restore()
        }
      }
    }

    return () => {
      if (rafId !== undefined) cancelAnimationFrame(rafId)
    }
  }, [isPlaying, shape, zoomBeats])

  function handleDragHandlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)  // Pitfall 3: pointer capture
    isDragging.current = true
    dragStartY.current = e.clientY
    dragStartHeight.current = panelHeight
  }

  function handleDragHandlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging.current) return
    const dy = dragStartY.current - e.clientY  // drag up = positive dy = expand
    const newHeight = dragStartHeight.current + dy
    const maxHeight = Math.floor(window.innerHeight * PANEL_MAX_RATIO)
    onHeightChange(Math.max(PANEL_MIN, Math.min(maxHeight, newHeight)))
  }

  function handleDragHandlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    isDragging.current = false
    ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
  }

  function handleDragHandleDoubleClick() {
    // Toggle between collapsed (PANEL_MIN) and default (PANEL_DEFAULT)
    onHeightChange(panelHeight <= PANEL_MIN ? PANEL_DEFAULT : PANEL_MIN)
  }

  // Selected control-point indices keyed by property — lifted from AnimLane so the
  // RAF tick can pass the correct selectedIdx to drawLaneCanvas during playback (WR-04)
  const [selectedPoints, setSelectedPoints] = useState<Partial<Record<AnimatableProperty, number | null>>>({})

  // Ref to keep selectedPoints current inside RAF closure without re-running effect (RESEARCH pitfall 1)
  const selectedPointsRef = useRef(selectedPoints)
  useEffect(() => { selectedPointsRef.current = selectedPoints }, [selectedPoints])

  // Property picker state
  const [showPicker, setShowPicker] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  // Close picker on click-outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false)
      }
    }
    if (showPicker) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showPicker])

  // Add Curve handler
  function handleAddCurve(property: AnimatableProperty) {
    if (!shape) return
    // Default curve: 4 beat duration, 2 points at current property value (UI-SPEC Section 2c)
    const currentValue = property === 'size' ? shape.size
      : property === 'hue' ? shape.color.h
      : property === 'saturation' ? shape.color.s
      : shape.color.l
    const curve: SplineCurve = {
      duration: 4,
      points: [{ beat: 0, value: currentValue }, { beat: 4, value: currentValue }],
    }
    animationStore.getState().setCurve(shape.id, property, curve)
    setShowPicker(false)
  }

  // Only properties without an existing curve appear in the picker
  const unanimatedProperties = PROPERTIES.filter(p => !shapeCurves[p])
  const allAnimated = unanimatedProperties.length === 0

  return (
    <>
      {/* Drag handle — sits outside panel body so it's always visible */}
      <div
        className="animation-panel__drag-handle"
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize animation panel"
        aria-valuenow={panelHeight}
        aria-valuemin={PANEL_MIN}
        aria-valuemax={Math.floor(window.innerHeight * PANEL_MAX_RATIO)}
        onPointerDown={handleDragHandlePointerDown}
        onPointerMove={handleDragHandlePointerMove}
        onPointerUp={handleDragHandlePointerUp}
        onDoubleClick={handleDragHandleDoubleClick}
      />
      {/* Panel body — height controlled via parent's inline style */}
      <div className="animation-panel__body" style={{ overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div className="animation-panel__header">
          <span className="animation-panel__title">Animation</span>
          {shape && (
            <span className="animation-panel__shape-label">
              Cell ({shape.col}, {shape.row})
            </span>
          )}
          {/* Zoom segmented buttons — controls visible beat span across all lanes (ANIM-08, D-04, D-05) */}
          <div
            className="zoom-selector"
            role="group"
            aria-label="Timeline zoom"
          >
            {([1, 2, 4, 8, 16, 32, 64] as const).map((v) => (
              <button
                key={v}
                className={[
                  'zoom-selector__btn',
                  v === zoomBeats ? 'zoom-selector__btn--active' : '',
                ].filter(Boolean).join(' ')}
                aria-label={`Zoom to ${v} beats`}
                aria-pressed={v === zoomBeats}
                onClick={() => uiStore.getState().setZoomBeats(v)}
              >
                {v}
              </button>
            ))}
          </div>
          <div style={{ position: 'relative', marginLeft: 'auto' }}>
            <button
              className="animation-panel__add-btn btn"
              aria-label={allAnimated ? 'All properties already animated' : 'Add animation curve'}
              disabled={allAnimated || !shape}
              style={(allAnimated || !shape) ? { opacity: 0.35, cursor: 'not-allowed', pointerEvents: 'none' } : {}}
              onClick={() => shape && setShowPicker(!showPicker)}
            >
              + Add Curve
            </button>
            {showPicker && !allAnimated && shape && (
              <div
                className="anim-property-picker"
                role="listbox"
                aria-label="Choose property to animate"
                ref={pickerRef}
              >
                {unanimatedProperties.map((prop) => (
                  <button
                    key={prop}
                    className="anim-property-picker__item"
                    role="option"
                    aria-selected={false}
                    onClick={() => handleAddCurve(prop)}
                  >
                    {prop}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Lanes */}
        <div className="animation-panel__lanes">
          {Object.keys(shapeCurves).length === 0 ? (
            <div className="animation-panel__empty">
              <span className="animation-panel__empty-text">
                No curves yet. Click a shape and press Animate.
              </span>
            </div>
          ) : (
            PROPERTIES.filter(p => shapeCurves[p]).map((property) => (
              <AnimLane
                key={property}
                property={property}
                curve={shapeCurves[property]!}
                shapeId={shape!.id}
                onCanvasRef={handleCanvasRef}
                selectedPointIdx={selectedPoints[property] ?? null}
                onSelectedPointChange={(idx) => setSelectedPoints(prev => ({ ...prev, [property]: idx }))}
              />
            ))
          )}
        </div>
      </div>
    </>
  )
}

// ── drawLaneCanvas helper (pure function) ─────────────────────────────────────

function drawLaneCanvas(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  curve: SplineCurve,
  property: AnimatableProperty,
  selectedIdx: number | null,
  playheadBeat?: number,
  zoomBeats?: number,           // NEW — Phase 9: X-axis denominator override (D-07)
): void {
  ctx.clearRect(0, 0, w, h)
  // Background
  ctx.fillStyle = '#111113'  // --color-bg-primary
  ctx.fillRect(0, 0, w, h)

  // X-axis baseline (midpoint dashed line)
  ctx.strokeStyle = 'rgba(255,255,255,0.10)'
  ctx.lineWidth = 1
  ctx.setLineDash([4, 4])
  ctx.beginPath()
  ctx.moveTo(0, h / 2)
  ctx.lineTo(w, h / 2)
  ctx.stroke()
  ctx.setLineDash([])

  const [minVal, maxVal] = property === 'hue' ? [0, 360] : [0, 100]
  const xDenominator = zoomBeats ?? curve.duration   // NEW — Phase 9 (D-07)

  function toPixel(p: SplinePoint): [number, number] {
    const px = (p.beat / xDenominator) * w      // CHANGED: curve.duration → xDenominator
    const py = ((maxVal - p.value) / (maxVal - minVal)) * h
    return [px, py]
  }

  // Filter to in-window points only (UI-SPEC: points outside duration are not rendered)
  const visible = curve.points
    .filter(p => p.beat <= curve.duration)
    .sort((a, b) => a.beat - b.beat)

  if (visible.length >= 2) {
    // Draw polyline
    ctx.strokeStyle = '#6366f1'  // --color-accent
    ctx.lineWidth = 1.5
    ctx.beginPath()
    const [x0, y0] = toPixel(visible[0])
    ctx.moveTo(x0, y0)
    for (let i = 1; i < visible.length; i++) {
      const [xi, yi] = toPixel(visible[i])
      ctx.lineTo(xi, yi)
    }
    ctx.stroke()
  }

  // Draw control points
  for (let i = 0; i < visible.length; i++) {
    const [px, py] = toPixel(visible[i])
    const isSelected = selectedIdx !== null && curve.points.indexOf(visible[i]) === selectedIdx
    const radius = isSelected ? 6 : 5  // 12px / 10px diameter
    ctx.beginPath()
    ctx.arc(px, py, radius, 0, Math.PI * 2)
    ctx.fillStyle = isSelected ? '#6366f1' : 'rgba(255,255,255,0.55)'
    ctx.fill()
  }

  // Playhead line — drawn last so it appears on top of curve and control points (D-06)
  // When playheadBeat is undefined the line still draws at beat 0 (x = 0, left edge)
  const phBeat = playheadBeat ?? 0
  const phX = curve.duration > 0
    ? (phBeat % curve.duration) / xDenominator * w   // modulo stays curve.duration; display scale uses xDenominator
    : 0
  ctx.strokeStyle = '#6366f1'  // --color-accent, hardcoded per D-06
  ctx.lineWidth = 2
  ctx.setLineDash([])
  ctx.beginPath()
  ctx.moveTo(phX, 0)
  ctx.lineTo(phX, h)
  ctx.stroke()
}

// ── AnimLane sub-component ────────────────────────────────────────────────────

interface AnimLaneProps {
  property: AnimatableProperty
  curve: SplineCurve
  shapeId: string
  onCanvasRef: (property: AnimatableProperty, ref: HTMLCanvasElement | null) => void
  selectedPointIdx: number | null
  onSelectedPointChange: (idx: number | null) => void
}

function AnimLane({ property, curve, shapeId, onCanvasRef, selectedPointIdx, onSelectedPointChange }: AnimLaneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDraggingPoint = useRef(false)
  const canvasRect = useRef<DOMRect | null>(null)

  // Lane focus state — read from uiStore (ANIM-11, D-11)
  const focusedLane = useUiStore((s) => s.focusedLane)
  const isFocused = focusedLane === property
  const isCompressed = focusedLane !== null && !isFocused

  // Toggle focus on label column click (D-13)
  function handleLabelColClick() {
    const { focusedLane: current, setFocusedLane } = uiStore.getState()
    setFocusedLane(current === property ? null : property)
  }

  // Register canvas ref with parent AnimationPanel for RAF loop access (D-02)
  useEffect(() => {
    onCanvasRef(property, canvasRef.current)
    return () => { onCanvasRef(property, null) }
  }, [property, onCanvasRef])

  // Canvas sizing via ResizeObserver (UI-SPEC Pitfall 2)
  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return
    const ro = new ResizeObserver(() => {
      canvas.width = container.clientWidth
      canvas.height = container.clientHeight
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [])

  // Draw curve on canvas when curve data, selection, or property changes
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const zoom = uiStore.getState().zoomBeats
    drawLaneCanvas(ctx, canvas.width, canvas.height, curve, property, selectedPointIdx, undefined, zoom)
  }, [curve, property, selectedPointIdx])

  function getPropertyRange(prop: AnimatableProperty): [number, number] {
    return prop === 'hue' ? [0, 360] : [0, 100]
  }

  // Convert canvas pixel coords → (beat, value)
  function pixelToPoint(px: number, py: number): SplinePoint {
    const canvas = canvasRef.current!
    const [minVal, maxVal] = getPropertyRange(property)
    const zoom = uiStore.getState().zoomBeats
    const beat = (px / canvas.width) * zoom
    const value = maxVal - (py / canvas.height) * (maxVal - minVal)
    return {
      beat: Math.max(0, Math.min(curve.duration, beat)),
      value: Math.max(minVal, Math.min(maxVal, value)),
    }
  }

  // Convert (beat, value) → canvas pixel coords
  function pointToPixel(p: SplinePoint, w: number, h: number): [number, number] {
    const [minVal, maxVal] = getPropertyRange(property)
    const zoom = uiStore.getState().zoomBeats
    const px = (p.beat / zoom) * w
    const py = ((maxVal - p.value) / (maxVal - minVal)) * h
    return [px, py]
  }

  // Hit test: find point within 8px of canvas click
  function findPointAt(px: number, py: number): number {
    const canvas = canvasRef.current!
    const HIT_RADIUS = 8
    for (let i = 0; i < curve.points.length; i++) {
      const [cx, cy] = pointToPixel(curve.points[i], canvas.width, canvas.height)
      if (Math.hypot(px - cx, py - cy) <= HIT_RADIUS) return i
    }
    return -1
  }

  function handleCanvasPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!
    canvasRect.current = canvas.getBoundingClientRect()
    const px = e.clientX - canvasRect.current.left
    const py = e.clientY - canvasRect.current.top

    // Phase 9: ignore clicks in ghost region (D-10)
    const currentZoom = uiStore.getState().zoomBeats
    const primaryRegionWidth = (curve.duration / currentZoom) * canvas.width
    if (px > primaryRegionWidth) return

    const hitIdx = findPointAt(px, py)
    if (hitIdx >= 0) {
      // Click on existing point — select for drag
      onSelectedPointChange(hitIdx)
      isDraggingPoint.current = true
      canvas.setPointerCapture(e.pointerId)
    } else {
      // Click on empty canvas — insert new point
      const newPoint = pixelToPoint(px, py)
      const newPoints = [...curve.points, newPoint].sort((a, b) => a.beat - b.beat)
      animationStore.getState().setCurve(shapeId, property, { ...curve, points: newPoints })
      onSelectedPointChange(null)
    }
  }

  function handleCanvasPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDraggingPoint.current || selectedPointIdx === null) return
    const rect = canvasRect.current ?? canvasRef.current!.getBoundingClientRect()
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top

    // Phase 9: ignore movement in ghost region (D-10)
    const canvas = canvasRef.current!
    const currentZoom = uiStore.getState().zoomBeats
    const primaryRegionWidth = (curve.duration / currentZoom) * canvas.width
    if (px > primaryRegionWidth) return

    const updated = pixelToPoint(px, py)
    const newPoints = curve.points.map((p, i) => i === selectedPointIdx ? updated : p)
    animationStore.getState().setCurve(shapeId, property, { ...curve, points: newPoints })
  }

  function handleCanvasPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    isDraggingPoint.current = false
    canvasRef.current?.releasePointerCapture(e.pointerId)
  }

  function handleCanvasDoubleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    const hitIdx = findPointAt(px, py)
    if (hitIdx < 0) return
    if (curve.points.length <= 2) return  // minimum 2 points invariant (T-07-04-03)
    const newPoints = curve.points.filter((_, i) => i !== hitIdx)
    animationStore.getState().setCurve(shapeId, property, { ...curve, points: newPoints })
    onSelectedPointChange(null)
  }

  function handleDurationChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = parseFloat(e.target.value)
    if (isNaN(raw)) return  // validate on blur (UI-SPEC Section States)
    const clamped = Math.max(0.25, Math.min(64, raw))
    animationStore.getState().setCurve(shapeId, property, { ...curve, duration: clamped })
  }

  function handleDurationBlur(e: React.FocusEvent<HTMLInputElement>) {
    // Restore valid value if input is empty or out of range (T-07-04-01)
    const raw = parseFloat(e.target.value)
    if (isNaN(raw) || raw < 0.25 || raw > 64) {
      // Force re-render by triggering a no-op update — curve.duration is still valid
      animationStore.getState().setCurve(shapeId, property, { ...curve })
    }
  }

  return (
    <div
      className={[
        'anim-lane',
        isFocused ? 'anim-lane--focused' : '',
        isCompressed ? 'anim-lane--compressed' : '',
      ].filter(Boolean).join(' ')}
      data-property={property}
    >
      <div
        className="anim-lane__label-col"
        role="button"
        tabIndex={0}
        aria-label={`Focus ${property} lane`}
        aria-pressed={isFocused}
        onClick={handleLabelColClick}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleLabelColClick() }}
      >
        <span className="anim-lane__prop-name">{property}</span>
        <div className="anim-lane__duration-row">
          <input
            className="anim-lane__duration-input"
            type="number"
            min={0.25}
            max={64}
            step={0.25}
            value={curve.duration}
            aria-label={`${property} loop duration in beats`}
            onChange={handleDurationChange}
            onBlur={handleDurationBlur}
          />
          <span className="anim-lane__duration-unit">b</span>
        </div>
        <button
          className="anim-lane__remove-btn"
          aria-label={`Remove ${property} curve`}
          onClick={(e) => {
            e.stopPropagation()
            animationStore.getState().removeCurve(shapeId, property)
          }}
        >
          ×
        </button>
      </div>
      <div className="anim-lane__canvas-col" ref={containerRef}>
        <canvas
          className="anim-lane__canvas"
          ref={canvasRef}
          aria-label={`${property} animation curve`}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerUp}
          onDoubleClick={handleCanvasDoubleClick}
        />
      </div>
    </div>
  )
}

export { PANEL_DEFAULT }
