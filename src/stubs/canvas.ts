// Lightweight browser stub for the optional 'canvas' Node module.
// pdfjs-dist's NodeCanvasFactory attempts `require("canvas")` in the CJS build.
// We only perform text extraction and never render pages server-side, so a minimal stub suffices.
// If rendering to images is later required in Node, replace this with the real 'canvas' package.

export interface StubCanvas {
  width: number;
  height: number;
  getContext: (type: string) => CanvasRenderingContext2D | null;
  toBuffer?: () => ArrayBuffer;
}

export function createCanvas(width: number, height: number): StubCanvas {
  // In the browser we can create a real <canvas>; on the server this file should not be executed.
  if (typeof document !== 'undefined') {
    const el = document.createElement('canvas');
    el.width = width;
    el.height = height;
    return el as unknown as StubCanvas;
  }
  // Fallback non-DOM stub (should not be used for actual rendering in this app scenario).
  return {
    width,
    height,
    getContext: () => null,
    toBuffer: () => new ArrayBuffer(0),
  };
}

export default { createCanvas };
