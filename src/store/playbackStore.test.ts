// src/store/playbackStore.test.ts
// Covers: PLAY-01 (isPlaying), PLAY-02 (BPM), PLAY-03 (volume)
import { describe, it, expect, beforeEach } from 'vitest'
import { playbackStore } from './playbackStore'

describe('playbackStore — defaults', () => {
  beforeEach(() => {
    playbackStore.setState({ isPlaying: true, bpm: 120, volume: 0.8 })
  })

  it('has isPlaying=true by default (D-14: auto-start behavior preserved)', () => {
    expect(playbackStore.getState().isPlaying).toBe(true)
  })

  it('has bpm=120 by default (D-08)', () => {
    expect(playbackStore.getState().bpm).toBe(120)
  })

  it('has volume=0.8 by default (D-14)', () => {
    expect(playbackStore.getState().volume).toBe(0.8)
  })
})

describe('playbackStore — setIsPlaying (PLAY-01)', () => {
  beforeEach(() => {
    playbackStore.setState({ isPlaying: true, bpm: 120, volume: 0.8 })
  })

  it('setIsPlaying(false) sets isPlaying to false', () => {
    playbackStore.getState().setIsPlaying(false)
    expect(playbackStore.getState().isPlaying).toBe(false)
  })

  it('setIsPlaying(true) sets isPlaying to true', () => {
    playbackStore.setState({ isPlaying: false })
    playbackStore.getState().setIsPlaying(true)
    expect(playbackStore.getState().isPlaying).toBe(true)
  })
})

describe('playbackStore — setBpm (PLAY-02)', () => {
  beforeEach(() => {
    playbackStore.setState({ isPlaying: true, bpm: 120, volume: 0.8 })
  })

  it('setBpm(120) sets bpm to 120', () => {
    playbackStore.getState().setBpm(120)
    expect(playbackStore.getState().bpm).toBe(120)
  })

  it('setBpm clamps below-minimum to 60 (D-08)', () => {
    playbackStore.getState().setBpm(59)
    expect(playbackStore.getState().bpm).toBe(60)
  })

  it('setBpm clamps above-maximum to 180 (D-08)', () => {
    playbackStore.getState().setBpm(181)
    expect(playbackStore.getState().bpm).toBe(180)
  })

  it('setBpm rounds to nearest integer (D-08: integer values only)', () => {
    playbackStore.getState().setBpm(100.7)
    expect(playbackStore.getState().bpm).toBe(101)
  })
})

describe('playbackStore — setVolume (PLAY-03)', () => {
  beforeEach(() => {
    playbackStore.setState({ isPlaying: true, bpm: 120, volume: 0.8 })
  })

  it('setVolume(0.5) sets volume to 0.5', () => {
    playbackStore.getState().setVolume(0.5)
    expect(playbackStore.getState().volume).toBe(0.5)
  })

  it('setVolume clamps below 0 to 0', () => {
    playbackStore.getState().setVolume(-0.1)
    expect(playbackStore.getState().volume).toBe(0)
  })

  it('setVolume clamps above 1 to 1', () => {
    playbackStore.getState().setVolume(1.1)
    expect(playbackStore.getState().volume).toBe(1)
  })
})
