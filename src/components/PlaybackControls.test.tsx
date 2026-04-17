// src/components/PlaybackControls.test.tsx
// Covers: PLAY-01 (Start/Stop button), PLAY-02 (BPM widget), PLAY-03 (volume slider)
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PlaybackControls } from './PlaybackControls'
import { playbackStore } from '../store/playbackStore'

describe('PlaybackControls — Start/Stop button (PLAY-01)', () => {
  beforeEach(() => {
    playbackStore.setState({ isPlaying: true, bpm: 120, volume: 0.8 })
  })

  it('renders "Stop" label when isPlaying is true (D-03)', () => {
    render(<PlaybackControls />)
    expect(screen.getByRole('button', { name: /Stop playback/i })).toBeTruthy()
    expect(screen.getByText('Stop')).toBeTruthy()
  })

  it('renders "Start" label when isPlaying is false (D-03)', () => {
    playbackStore.setState({ isPlaying: false, bpm: 120, volume: 0.8 })
    render(<PlaybackControls />)
    expect(screen.getByRole('button', { name: /Start playback/i })).toBeTruthy()
    expect(screen.getByText('Start')).toBeTruthy()
  })

  it('clicking Start/Stop button toggles isPlaying', () => {
    playbackStore.setState({ isPlaying: false, bpm: 120, volume: 0.8 })
    render(<PlaybackControls />)
    fireEvent.click(screen.getByText('Start'))
    expect(playbackStore.getState().isPlaying).toBe(true)
  })
})

describe('PlaybackControls — BPM widget (PLAY-02)', () => {
  beforeEach(() => {
    playbackStore.setState({ isPlaying: true, bpm: 120, volume: 0.8 })
  })

  it('renders BPM decrease button with aria-label "Decrease BPM" (D-12)', () => {
    render(<PlaybackControls />)
    expect(screen.getByLabelText('Decrease BPM')).toBeTruthy()
  })

  it('renders BPM increase button with aria-label "Increase BPM" (D-12)', () => {
    render(<PlaybackControls />)
    expect(screen.getByLabelText('Increase BPM')).toBeTruthy()
  })

  it('clicking − button decrements BPM by 1', () => {
    render(<PlaybackControls />)
    fireEvent.click(screen.getByLabelText('Decrease BPM'))
    expect(playbackStore.getState().bpm).toBe(119)
  })

  it('clicking + button increments BPM by 1', () => {
    render(<PlaybackControls />)
    fireEvent.click(screen.getByLabelText('Increase BPM'))
    expect(playbackStore.getState().bpm).toBe(121)
  })
})

describe('PlaybackControls — Volume slider (PLAY-03)', () => {
  beforeEach(() => {
    playbackStore.setState({ isPlaying: true, bpm: 120, volume: 0.8 })
  })

  it('renders volume slider with aria-label "Master volume" (D-11)', () => {
    render(<PlaybackControls />)
    expect(screen.getByLabelText('Master volume')).toBeTruthy()
  })
})
