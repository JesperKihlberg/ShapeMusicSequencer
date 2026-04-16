// src/components/ShapeTypeSelector.tsx
// 6 mini-canvas shape type buttons. Each renders the shape using drawShape helper.
// Props: currentType, shapeColor, onChange
// D-07: 6 compact buttons in a row, each with a mini 32x32 canvas preview
import { useRef, useEffect } from 'react'
import type { ShapeType, ShapeColor } from '../store/shapeStore'
import { drawShape } from '../engine/drawShape'

const ALL_TYPES: ShapeType[] = ['circle', 'triangle', 'square', 'diamond', 'star', 'blob']

interface ShapeTypeSelectorProps {
  currentType: ShapeType
  shapeColor: ShapeColor
  onChange: (type: ShapeType) => void
}

interface TypeButtonProps {
  type: ShapeType
  color: ShapeColor
  isActive: boolean
  onClick: (type: ShapeType) => void
}

function TypeButton({ type, color, isActive, onClick }: TypeButtonProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    // DPR-unaware at PoC scope (UI-SPEC Pitfall 2 — mini preview, softness acceptable)
    canvas.width = 32
    canvas.height = 32
    ctx.clearRect(0, 0, 32, 32)
    drawShape(ctx, 16, 16, 12, type, color)
  }, [type, color.h, color.s, color.l])  // individual h/s/l to avoid object reference issues

  return (
    <button
      className={`type-selector__btn${isActive ? ' type-selector__btn--active' : ''}`}
      onClick={() => onClick(type)}
      aria-label={`${type} shape`}
      aria-pressed={isActive}
    >
      <canvas ref={canvasRef} className="type-selector__canvas" />
    </button>
  )
}

export function ShapeTypeSelector({ currentType, shapeColor, onChange }: ShapeTypeSelectorProps) {
  return (
    <div className="type-selector">
      {ALL_TYPES.map((type) => (
        <TypeButton
          key={type}
          type={type}
          color={shapeColor}
          isActive={currentType === type}
          onClick={onChange}
        />
      ))}
    </div>
  )
}
