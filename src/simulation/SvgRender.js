import { useStore } from "../store";

const ROUNDED_CORNER_ELEMENTS = new Set([5, 6, 7, 8]);
const TRAIL_ELEMENT = 10;
const SHIP_ELEMENT = 9;

const FILL_COLORS = {
  5: '#000000',
  6: '#29FD2F',
  7: '#29FD2F', 
  8: '#000000',
};

const HOLE_ELEMENTS = new Set([5, 6]);
const isSolidTile = (id) => ROUNDED_CORNER_ELEMENTS.has(id);

class SvgRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.svgImages = new Map();
    this.w = 300;
    this.initializeSvgs();
  }

  async initializeSvgs() {
    try {
      const res = await fetch('/svgs/city.svg');
      const txt = await res.text();
      const img = new Image();
      const blob = new Blob([txt], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      img.onload = () => { this.svgImages.set(4, img); URL.revokeObjectURL(url); };
      img.src = url;
    } catch (e) {}
  }

  hasSolid(sands, x, y, ww, wh) {
    if (x < 0 || x >= ww || y < 0 || y >= wh) return false;
    return isSolidTile(sands[(y * this.w + x) * 4]);
  }

  getElement(sands, x, y, ww, wh) {
    if (x < 0 || x >= ww || y < 0 || y >= wh) return 0;
    return sands[(y * this.w + x) * 4];
  }

  render(sands, ww, wh) {
    const { colors, color2s } = useStore.getState();
    const ctx = this.ctx;
    const w = this.w;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const cs = Math.min(this.canvas.width / ww, this.canvas.height / wh);
    const r = cs/3 ; // Radius for outer corners and inner bridges

    // PASS 1: Draw all base tiles as full squares
    for (let y = 0; y < wh; y++) {
      for (let x = 0; x < ww; x++) {
        const e = sands[(y * w + x) * 4];
        if (!ROUNDED_CORNER_ELEMENTS.has(e)) continue;
        
        const px = x * cs;
        const py = y * cs;
        const fill = FILL_COLORS[e];
        
        ctx.fillStyle = fill;
        ctx.fillRect(px, py, cs, cs);
      }
    }

    // PASS 2: Cut rounded outer corners ONLY
    ctx.globalCompositeOperation = 'destination-out';
    
    for (let y = 0; y < wh; y++) {
      for (let x = 0; x < ww; x++) {
        const e = sands[(y * w + x) * 4];
        if (!ROUNDED_CORNER_ELEMENTS.has(e)) continue;
        
        const px = x * cs;
        const py = y * cs;
        
        const top = this.hasSolid(sands, x, y - 1, ww, wh);
        const right = this.hasSolid(sands, x + 1, y, ww, wh);
        const bottom = this.hasSolid(sands, x, y + 1, ww, wh);
        const left = this.hasSolid(sands, x - 1, y, ww, wh);
        const diagTL = this.hasSolid(sands, x - 1, y - 1, ww, wh);
        const diagTR = this.hasSolid(sands, x + 1, y - 1, ww, wh);
        const diagBR = this.hasSolid(sands, x + 1, y + 1, ww, wh);
        const diagBL = this.hasSolid(sands, x - 1, y + 1, ww, wh);

        // Cut outer rounded corners (only when no diagonal connection)
        if (!top && !left && !diagTL) {
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px + r, py);
          ctx.quadraticCurveTo(px, py, px, py + r);
          ctx.closePath();
          ctx.fill();
        }
        
        if (!top && !right && !diagTR) {
          ctx.beginPath();
          ctx.moveTo(px + cs, py);
          ctx.lineTo(px + cs, py + r);
          ctx.quadraticCurveTo(px + cs, py, px + cs - r, py);
          ctx.closePath();
          ctx.fill();
        }
        
        if (!bottom && !right && !diagBR) {
          ctx.beginPath();
          ctx.moveTo(px + cs, py + cs);
          ctx.lineTo(px + cs - r, py + cs);
          ctx.quadraticCurveTo(px + cs, py + cs, px + cs, py + cs - r);
          ctx.closePath();
          ctx.fill();
        }
        
        if (!bottom && !left && !diagBL) {
          ctx.beginPath();
          ctx.moveTo(px, py + cs);
          ctx.lineTo(px, py + cs - r);
          ctx.quadraticCurveTo(px, py + cs, px + r, py + cs);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
    
    ctx.globalCompositeOperation = 'source-over';

    // PASS 3: Harbor holes
    for (let y = 0; y < wh; y++) {
      for (let x = 0; x < ww; x++) {
        const e = sands[(y * w + x) * 4];
        if (HOLE_ELEMENTS.has(e)) {
          const px = x * cs;
          const py = y * cs;
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(px + cs / 2, py + cs / 2, cs * 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // PASS 4: Trails
    this.renderTrails(sands, ww, wh, cs, colors);

    // PASS 5: Other elements
    for (let y = 0; y < wh; y++) {
      for (let x = 0; x < ww; x++) {
        const idx = (y * w + x) * 4;
        const e = sands[idx];
        if (e === 0 || ROUNDED_CORNER_ELEMENTS.has(e) || e === TRAIL_ELEMENT) continue;
        
        const px = x * cs, py = y * cs;
        
        if (e === 4 && this.svgImages.has(4)) {
          ctx.drawImage(this.svgImages.get(4), px, py, cs, cs);
        } else if (e === SHIP_ELEMENT) {
          ctx.fillStyle = '#0066FF';
          ctx.beginPath();
          const cx = px + cs / 2, cy = py + cs / 2, hs = cs / 2;
          ctx.moveTo(cx, cy - hs);
          ctx.lineTo(cx + hs, cy);
          ctx.lineTo(cx, cy + hs);
          ctx.lineTo(cx - hs, cy);
          ctx.closePath();
          ctx.fill();
        } else {
          const c1 = colors[e] || [0.5, 0.5, 0.5];
          const c2 = color2s[e] || [0.5, 0.5, 0.5];
          const ra = (sands[idx + 1] || 50) / 100;
          const h = c1[0] * (1 - ra) + c2[0] * ra;
          const s = c1[1] * (1 - ra) + c2[1] * ra;
          const l = c1[2] * (1 - ra) + c2[2] * ra;
          ctx.fillStyle = `hsl(${h * 360},${s * 100}%,${l * 100}%)`;
          ctx.fillRect(px, py, cs, cs);
        }
      }
    }

    // PASS 6: Add inverse corner bridges in empty cells adjacent to solid L-patterns
    for (let y = 0; y < wh; y++) {
      for (let x = 0; x < ww; x++) {
        const e = sands[(y * w + x) * 4];
        if (ROUNDED_CORNER_ELEMENTS.has(e)) continue;
        
        const px = x * cs;
        const py = y * cs;
        const top = this.hasSolid(sands, x, y - 1, ww, wh);
        const right = this.hasSolid(sands, x + 1, y, ww, wh);
        const bottom = this.hasSolid(sands, x, y + 1, ww, wh);
        const left = this.hasSolid(sands, x - 1, y, ww, wh);
        
        // For each corner, check if two adjacent sides are solid
        // If so, fill that corner with a rounded bridge matching the tile color
        const corners = [
          { cond: top && left, x: px, y: py, dir: [r, 0, 0, r], neighbor: [x, y - 1] },
          { cond: top && right, x: px + cs, y: py, dir: [-r, 0, 0, r], neighbor: [x + 1, y] },
          { cond: bottom && right, x: px + cs, y: py + cs, dir: [-r, 0, 0, -r], neighbor: [x + 1, y] },
          { cond: bottom && left, x: px, y: py + cs, dir: [r, 0, 0, -r], neighbor: [x, y + 1] }
        ];
        
        for (const corner of corners) {
          if (!corner.cond) continue;
          const [nx, ny] = corner.neighbor;
          const neighborElement = this.getElement(sands, nx, ny, ww, wh);
          ctx.fillStyle = FILL_COLORS[neighborElement] || '#000000';
          
          ctx.beginPath();
          ctx.moveTo(corner.x, corner.y);
          ctx.lineTo(corner.x + corner.dir[0], corner.y + corner.dir[1]);
          ctx.quadraticCurveTo(corner.x, corner.y, corner.x + corner.dir[2], corner.y + corner.dir[3]);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
  }

  renderTrails(sands, ww, wh, cs, colors) {
    const w = this.w;
    const pos = [];
    for (let y = 0; y < wh; y++)
      for (let x = 0; x < ww; x++)
        if (sands[(y * w + x) * 4] === TRAIL_ELEMENT) pos.push({ x, y });

    if (!pos.length) return;

    const c = colors[TRAIL_ELEMENT] || [0.6, 0.7, 0.8];
    const col = `hsl(${c[0] * 360},${c[1] * 100}%,${c[2] * 100}%)`;

    const key = (x, y) => y * ww + x;
    const map = new Map(pos.map(p => [key(p.x, p.y), p]));
    const vis = new Set();
    const segs = [];

    for (const st of pos) {
      const k = key(st.x, st.y);
      if (vis.has(k)) continue;
      const seg = [], stk = [st];
      vis.add(k);
      while (stk.length) {
        const cur = stk.pop();
        seg.push(cur);
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const nk = key(cur.x + dx, cur.y + dy);
            if (map.has(nk) && !vis.has(nk)) { vis.add(nk); stk.push(map.get(nk)); }
          }
      }
      segs.push(seg);
    }

    const ctx = this.ctx;
    ctx.strokeStyle = col;
    ctx.fillStyle = col;
    ctx.lineWidth = cs * 0.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const seg of segs) {
      if (seg.length === 1) {
        ctx.beginPath();
        ctx.arc(seg[0].x * cs + cs / 2, seg[0].y * cs + cs / 2, cs * 0.3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const ord = this.order(seg);
        ctx.beginPath();
        ctx.moveTo(ord[0].x * cs + cs / 2, ord[0].y * cs + cs / 2);
        for (let i = 1; i < ord.length; i++) ctx.lineTo(ord[i].x * cs + cs / 2, ord[i].y * cs + cs / 2);
        ctx.stroke();
      }
    }
  }

  order(pts) {
    if (pts.length <= 2) return pts;
    const ord = [pts[0]], rem = new Set(pts.slice(1));
    while (rem.size) {
      const last = ord[ord.length - 1];
      let near = null, nd = Infinity;
      for (const p of rem) {
        const d = Math.abs(p.x - last.x) + Math.abs(p.y - last.y);
        if (d < nd) { nd = d; near = p; }
      }
      if (near && nd <= 2) { ord.push(near); rem.delete(near); }
      else { const n = rem.values().next().value; ord.push(n); rem.delete(n); }
    }
    return ord;
  }
}

export function startSvgGL({ canvas, sands }) {
  const renderer = new SvgRenderer(canvas);
  return {
    render: () => {
      const { worldWidth, worldHeight } = useStore.getState();
      renderer.render(sands, worldWidth, worldHeight);
    },
    renderer
  };
}

export default SvgRenderer;