// src/components/HsvSliders.tsx
// Three gradient-track range sliders for Hue (0–360), Saturation (0–100), Lightness (0–100)
// Props: color: ShapeColor, onChange: (color: ShapeColor) => void
// All changes fire on React onChange (= native input event, fires on every move) — D-03
import type { ShapeColor } from '../store/shapeStore'

interface HsvSlidersProps {
  color: ShapeColor
  onChange: (color: ShapeColor) => void
}

export function HsvSliders({ color, onChange }: HsvSlidersProps) {
  const { h, s, l } = color

  // Dynamic gradient tracks — D-02
  // Hue track: fixed rainbow (does not depend on current s/l)
  const hueGradient = [
    'hsl(0,100%,50%)', 'hsl(30,100%,50%)', 'hsl(60,100%,50%)',
    'hsl(90,100%,50%)', 'hsl(120,100%,50%)', 'hsl(150,100%,50%)',
    'hsl(180,100%,50%)', 'hsl(210,100%,50%)', 'hsl(240,100%,50%)',
    'hsl(270,100%,50%)', 'hsl(300,100%,50%)', 'hsl(330,100%,50%)',
    'hsl(360,100%,50%)',
  ].join(', ')
  const hueTrack = `linear-gradient(to right, ${hueGradient})`
  // Saturation track: grey→vivid at current hue/lightness
  const satTrack = `linear-gradient(to right, hsl(${h}, 0%, ${l}%), hsl(${h}, 100%, ${l}%))`
  // Lightness track: dark→color→light at current hue/saturation
  const lightTrack = `linear-gradient(to right, hsl(${h}, ${s}%, 0%), hsl(${h}, ${s}%, 50%), hsl(${h}, ${s}%, 100%))`

  return (
    <>
      {/* Hue */}
      <div className="control-group">
        <div className="control-group__label-row">
          <label className="control-group__label" htmlFor="slider-hue">Hue</label>
          <span className="control-group__readout">{h}</span>
        </div>
        <div className="slider-wrap">
          <div className="slider-wrap__track" style={{ background: hueTrack }} />
          <input
            id="slider-hue"
            type="range"
            min={0}
            max={360}
            value={h}
            onChange={(e) => onChange({ ...color, h: Number(e.target.value) })}
            aria-label="Hue, 0 to 360"
          />
        </div>
      </div>

      {/* Saturation */}
      <div className="control-group">
        <div className="control-group__label-row">
          <label className="control-group__label" htmlFor="slider-sat">Saturation</label>
          <span className="control-group__readout">{s}</span>
        </div>
        <div className="slider-wrap">
          <div className="slider-wrap__track" style={{ background: satTrack }} />
          <input
            id="slider-sat"
            type="range"
            min={0}
            max={100}
            value={s}
            onChange={(e) => onChange({ ...color, s: Number(e.target.value) })}
            aria-label="Saturation, 0 to 100"
          />
        </div>
      </div>

      {/* Lightness */}
      <div className="control-group">
        <div className="control-group__label-row">
          <label className="control-group__label" htmlFor="slider-light">Lightness</label>
          <span className="control-group__readout">{l}</span>
        </div>
        <div className="slider-wrap">
          <div className="slider-wrap__track" style={{ background: lightTrack }} />
          <input
            id="slider-light"
            type="range"
            min={0}
            max={100}
            value={l}
            onChange={(e) => onChange({ ...color, l: Number(e.target.value) })}
            aria-label="Lightness, 0 to 100"
          />
        </div>
      </div>
    </>
  )
}
