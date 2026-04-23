import '@testing-library/jest-dom'

// Mock ResizeObserver — not available in jsdom (RESEARCH.md Pitfall 4)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock HTMLCanvasElement.getContext — jsdom canvas is a stub
HTMLCanvasElement.prototype.getContext = function () {
  return {
    fillRect: () => {},
    clearRect: () => {},
    getImageData: () => ({ data: new Array(4) }),
    putImageData: () => {},
    createImageData: () => [],
    setTransform: () => {},
    drawImage: () => {},
    save: () => {},
    fillText: () => {},
    restore: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    stroke: () => {},
    strokeRect: () => {},
    fill: () => {},
    arc: () => {},
    roundRect: () => {},
    setLineDash: () => {},
    getLineDash: () => [],
    scale: () => {},
    rotate: () => {},
    translate: () => {},
    transform: () => {},
    strokeText: () => {},
    measureText: () => ({ width: 0 }),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    globalAlpha: 1,
    canvas: {} as HTMLCanvasElement,
  } as unknown as CanvasRenderingContext2D
}
