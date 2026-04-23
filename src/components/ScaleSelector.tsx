// src/components/ScaleSelector.tsx
// Toolbar control: root key dropdown + scale dropdown (PLAY-05, PLAY-06)
// Placed left of PlaybackControls in the toolbar (Title | spacer | Scale | BPM | Volume | Start/Stop)
import { useScaleStore, scaleStore, SCALE_INTERVALS, type ScaleName } from '../store/scaleStore'

const ROOT_KEY_LABELS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

const SCALE_LABELS: Record<ScaleName, string> = {
  'major':            'Major',
  'natural-minor':    'Natural Minor',
  'pentatonic-major': 'Pentatonic Major',
  'pentatonic-minor': 'Pentatonic Minor',
  'dorian':           'Dorian',
  'mixolydian':       'Mixolydian',
  'chromatic':        'Chromatic',
}

export function ScaleSelector() {
  const rootKey = useScaleStore((s) => s.rootKey)
  const scale = useScaleStore((s) => s.scale)

  return (
    <div className="scale-selector">
      <select
        aria-label="Root key"
        value={rootKey}
        onChange={(e) => scaleStore.getState().setRootKey(Number(e.target.value))}
      >
        {ROOT_KEY_LABELS.map((label, i) => (
          <option key={i} value={i}>{label}</option>
        ))}
      </select>
      <select
        aria-label="Scale"
        value={scale}
        onChange={(e) => scaleStore.getState().setScale(e.target.value as ScaleName)}
      >
        {(Object.keys(SCALE_INTERVALS) as ScaleName[]).map((s) => (
          <option key={s} value={s}>{SCALE_LABELS[s]}</option>
        ))}
      </select>
    </div>
  )
}

export default ScaleSelector
