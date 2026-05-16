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
    return isSolidTile(this.terrainElement(sands, x, y));
  }

  getElement(sands, x, y, ww, wh) {
    if (x < 0 || x >= ww || y < 0 || y >= wh) return 0;
    return sands[(y * this.w + x) * 4];
  }

  // Returns the underlying harbor type if a ship is docked there, else the real element
  terrainElement(sands, x, y) {
    const idx = (y * this.w + x) * 4;
    const e = sands[idx];
    if (e === SHIP_ELEMENT) {
      const rc = sands[idx + 3];
      if (rc === 5 || rc === 6) return rc;
    }
    return e;
  }

  render(sands, trails, ww, wh) {
    const { colors, color2s } = useStore.getState();
    const ctx = this.ctx;
    const w = this.w;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const cs = Math.min(this.canvas.width / ww, this.canvas.height / wh);
    const r = cs/3 ; // Radius for outer corners and inner bridges

    // PASS 1: Draw all base tiles as full squares
    for (let y = 0; y < wh; y++) {
      for (let x = 0; x < ww; x++) {
        const e = this.terrainElement(sands, x, y);
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
        const e = this.terrainElement(sands, x, y);
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

    // PASS 3: Harbor holes — cut transparent circles
    ctx.globalCompositeOperation = 'destination-out';
    for (let y = 0; y < wh; y++) {
      for (let x = 0; x < ww; x++) {
        const e = this.terrainElement(sands, x, y);
        if (HOLE_ELEMENTS.has(e)) {
          const px = x * cs;
          const py = y * cs;
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(px + cs / 2, py + cs / 2, cs * 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.globalCompositeOperation = 'source-over';

    // PASS 4: Trails — destination-over so they show through harbor holes but sit behind solid tiles
    ctx.globalCompositeOperation = 'destination-over';
    this.renderTrails(sands, trails, ww, wh, cs, colors);
    ctx.globalCompositeOperation = 'source-over';

    // PASS 5: Other elements
    for (let y = 0; y < wh; y++) {
      for (let x = 0; x < ww; x++) {
        const idx = (y * w + x) * 4;
        const e = sands[idx];
        if (e === 0 || ROUNDED_CORNER_ELEMENTS.has(e) || e === TRAIL_ELEMENT) continue;
        
        const px = x * cs, py = y * cs;
        
        if (e === 4 && this.svgImages.has(4)) {
          // Draw city background color
          const c1 = colors[e] || [0.5, 0.5, 0.5];
          const c2 = color2s[e] || [0.5, 0.5, 0.5];
          const ra = (sands[(y * w + x) * 4 + 1] || 50) / 100;
          const hh = c1[0] * (1 - ra) + c2[0] * ra;
          const ss = c1[1] * (1 - ra) + c2[1] * ra;
          const ll = c1[2] * (1 - ra) + c2[2] * ra;
          ctx.fillStyle = `hsl(${hh * 360},${ss * 100}%,${ll * 100}%)`;
          ctx.fillRect(px, py, cs, cs);
          // Cut star as transparent hole
          ctx.globalCompositeOperation = 'destination-out';
          ctx.drawImage(this.svgImages.get(4), px, py, cs, cs);
          ctx.globalCompositeOperation = 'source-over';
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
        const e = this.terrainElement(sands, x, y);
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

  renderTrails(sands, trails, ww, wh, cs, colors) {
    const c = colors[TRAIL_ELEMENT] || [0.6, 0.7, 0.8];
    const col = `hsl(${c[0] * 360},${c[1] * 100}%,${c[2] * 100}%)`;
    const ctx = this.ctx;

    ctx.strokeStyle = col;
    ctx.fillStyle = col;
    ctx.lineWidth = cs * 0.22;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let y = 0; y < wh; y++) {
      for (let x = 0; x < ww; x++) {
        const trailVal = trails[y * this.w + x];
        if (!trailVal) continue;

        const cx = x * cs + cs / 2;
        const cy = y * cs + cs / 2;

        // Draw dot
        ctx.beginPath();
        ctx.arc(cx, cy, cs * 0.11, 0, Math.PI * 2);
        ctx.fill();

        // Draw line for each packed direction (bits 0-3 = dir1, bits 4-7 = dir2)
        const dirs = [trailVal & 0x0F, (trailVal >> 4) & 0x0F];
        for (const dir of dirs) {
          if (!dir) continue;
          const d = dir - 1;
          const ddx = Math.floor(d / 3) - 1;
          const ddy = (d % 3) - 1;
          const nx = x + ddx;
          const ny = y + ddy;
          const neighborIsTrail = nx >= 0 && nx < ww && ny >= 0 && ny < wh && trails[ny * this.w + nx] > 0;
          const neighborIsShip = nx >= 0 && nx < ww && ny >= 0 && ny < wh && sands[(ny * this.w + nx) * 4] === SHIP_ELEMENT;
          if (neighborIsTrail || neighborIsShip) {
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(nx * cs + cs / 2, ny * cs + cs / 2);
            ctx.stroke();
          }
        }
      }
    }
  }
}

export function startSvgGL({ canvas, sands, trails }) {
  const renderer = new SvgRenderer(canvas);
  return {
    render: () => {
      const { worldWidth, worldHeight } = useStore.getState();
      renderer.render(sands, trails, worldWidth, worldHeight);
    },
    renderer
  };
}

export default SvgRenderer;