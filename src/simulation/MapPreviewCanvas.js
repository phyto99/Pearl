import React, { useRef, useEffect } from 'react';
import SvgRenderer from './SvgRender';

const STRIDE = 300;

function decodeToStrideBuf(sandsBase64, mW, mH) {
  const raw = Uint8Array.from(atob(sandsBase64), (c) => c.charCodeAt(0));
  const buf = new Uint8Array(STRIDE * 300 * 4);
  for (let y = 0; y < mH; y++) {
    for (let x = 0; x < mW; x++) {
      const src = (x + y * mW) * 4;
      const dst = (x + y * STRIDE) * 4;
      buf[dst]   = raw[src];
      buf[dst+1] = raw[src+1] || (Math.random() * 100 | 0);
      buf[dst+2] = raw[src+2];
      buf[dst+3] = raw[src+3];
    }
  }
  return buf;
}

// Simplified preview tick: creature elements (11-23) do random walks only.
// No hunger, no reproduction — just enough motion to look alive.
const DIRS = [[1,0],[-1,0],[0,1],[0,-1]];

function previewTick(buf, ww, wh) {
  for (let y = 1; y < wh - 1; y++) {
    for (let x = 1; x < ww - 1; x++) {
      const i = (y * STRIDE + x) * 4;
      const e = buf[i];
      if (e < 11 || e > 23) continue;
      if (Math.random() > 0.3) continue;
      const [dx, dy] = DIRS[Math.floor(Math.random() * 4)];
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || nx >= ww || ny < 0 || ny >= wh) continue;
      const j = (ny * STRIDE + nx) * 4;
      if (buf[j] === 0) {
        buf[j] = buf[i]; buf[j+1] = buf[i+1]; buf[j+2] = buf[i+2]; buf[j+3] = buf[i+3];
        buf[i] = 0; buf[i+1] = 0; buf[i+2] = 0; buf[i+3] = 0;
      }
    }
  }
}

export default function MapPreviewCanvas({ data, style }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data?.sandsBase64) return;

    const mW = data.worldWidth  || 75;
    const mH = data.worldHeight || 75;
    const buf    = decodeToStrideBuf(data.sandsBase64, mW, mH);
    const trails = new Uint8Array(STRIDE * 300);
    const renderer = new SvgRenderer(canvas);

    let frame = 0;
    function loop() {
      rafRef.current = requestAnimationFrame(loop);
      frame++;
      if (frame % 3 === 0) previewTick(buf, mW, mH);
      renderer.render(buf, trails, mW, mH);
    }
    loop();

    return () => cancelAnimationFrame(rafRef.current);
  }, [data]);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={300}
      style={{ display: 'block', width: '100%', height: '100%', imageRendering: 'pixelated', ...style }}
    />
  );
}
