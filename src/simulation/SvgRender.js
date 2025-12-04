import { useStore } from "../store";

// Elements that need rounded corner treatment (solid land tiles)
const ROUNDED_CORNER_ELEMENTS = new Set([5, 6, 7, 8]); // harbor, homeharbor, homeisland, island
const TRAIL_ELEMENT = 10;
const SHIP_ELEMENT = 9;

// Pre-computed fill colors for each element type
const FILL_COLORS = {
  5: '#000000', // Harbor - black
  6: '#29FD2F', // Home Harbor - green
  7: '#29FD2F', // Home Island - green
  8: '#000000', // Island - black
};

// Elements with holes (harbors)
const HOLE_ELEMENTS = new Set([5, 6]);

// Helper to check if an element is a "solid" tile
const isSolidTile = (elementId) => ROUNDED_CORNER_ELEMENTS.has(elementId);

class SvgRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.svgImages = new Map();
    this.loadingSvgs = false;
    this.svgsLoaded = false;
    this.w = 300; // Fixed width from SandApi
    
    this.initializeSvgs();
  }

  async initializeSvgs() {
    if (this.loadingSvgs) return;
    this.loadingSvgs = true;

    const svgFiles = { 4: 'city' };

    const loadPromises = Object.entries(svgFiles).map(([elementId, svgName]) => {
      return new Promise((resolve) => {
        fetch(`/svgs/${svgName}.svg`)
          .then(response => response.text())
          .then(svgText => {
            const img = new Image();
            const svgBlob = new Blob([svgText], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(svgBlob);
            img.onload = () => {
              this.svgImages.set(parseInt(elementId), img);
              URL.revokeObjectURL(url);
              resolve();
            };
            img.onerror = () => resolve();
            img.src = url;
          })
          .catch(() => resolve());
      });
    });

    await Promise.all(loadPromises);
    this.svgsLoaded = true;
  }

  // Optimized: Check if position has solid tile
  hasSolid(sands, x, y, worldWidth, worldHeight) {
    if (x < 0 || x >= worldWidth || y < 0 || y >= worldHeight) return false;
    return isSolidTile(sands[(y * this.w + x) * 4]);
  }

  // Draw the main tile body with rounded corners where appropriate
  drawTileBody(ctx, pixelX, pixelY, cellSize, hasTop, hasRight, hasBottom, hasLeft) {
    const r = cellSize * 0.45; // Corner radius
    
    // Corner is SQUARE if either adjacent cardinal neighbor exists
    // Corner is ROUNDED if no adjacent cardinal neighbors
    const tlSquare = hasTop || hasLeft;
    const trSquare = hasTop || hasRight;
    const brSquare = hasBottom || hasRight;
    const blSquare = hasBottom || hasLeft;
    
    ctx.beginPath();
    
    // Start at top-left, go clockwise
    if (tlSquare) {
      ctx.moveTo(pixelX, pixelY);
    } else {
      ctx.moveTo(pixelX + r, pixelY);
    }
    
    // Top edge -> Top-right corner
    if (trSquare) {
      ctx.lineTo(pixelX + cellSize, pixelY);
    } else {
      ctx.lineTo(pixelX + cellSize - r, pixelY);
      ctx.quadraticCurveTo(pixelX + cellSize, pixelY, pixelX + cellSize, pixelY + r);
    }
    
    // Right edge -> Bottom-right corner
    if (brSquare) {
      ctx.lineTo(pixelX + cellSize, pixelY + cellSize);
    } else {
      ctx.lineTo(pixelX + cellSize, pixelY + cellSize - r);
      ctx.quadraticCurveTo(pixelX + cellSize, pixelY + cellSize, pixelX + cellSize - r, pixelY + cellSize);
    }
    
    // Bottom edge -> Bottom-left corner
    if (blSquare) {
      ctx.lineTo(pixelX, pixelY + cellSize);
    } else {
      ctx.lineTo(pixelX + r, pixelY + cellSize);
      ctx.quadraticCurveTo(pixelX, pixelY + cellSize, pixelX, pixelY + cellSize - r);
    }
    
    // Left edge -> back to Top-left corner
    if (tlSquare) {
      ctx.lineTo(pixelX, pixelY);
    } else {
      ctx.lineTo(pixelX, pixelY + r);
      ctx.quadraticCurveTo(pixelX, pixelY, pixelX + r, pixelY);
    }
    
    ctx.closePath();
    ctx.fill();
  }

  // Draw a smooth convex bridge to connect diagonally adjacent tiles
  // The bridge curves OUTWARD (convex) to avoid sharp corners
  drawDiagonalBridge(ctx, pixelX, pixelY, cellSize, corner) {
    const r = cellSize * 0.45;
    
    ctx.beginPath();
    
    switch (corner) {
      case 'tl': // Top-left: bridge curves outward toward top-left
        // Start at the end of the rounded corner on top edge
        ctx.moveTo(pixelX + r, pixelY);
        // Curve outward to the corner point, then back to the left edge
        ctx.quadraticCurveTo(pixelX, pixelY, pixelX, pixelY + r);
        // Close with straight lines through the corner
        ctx.lineTo(pixelX, pixelY);
        ctx.closePath();
        break;
        
      case 'tr': // Top-right: bridge curves outward toward top-right
        ctx.moveTo(pixelX + cellSize, pixelY + r);
        ctx.quadraticCurveTo(pixelX + cellSize, pixelY, pixelX + cellSize - r, pixelY);
        ctx.lineTo(pixelX + cellSize, pixelY);
        ctx.closePath();
        break;
        
      case 'br': // Bottom-right: bridge curves outward toward bottom-right
        ctx.moveTo(pixelX + cellSize - r, pixelY + cellSize);
        ctx.quadraticCurveTo(pixelX + cellSize, pixelY + cellSize, pixelX + cellSize, pixelY + cellSize - r);
        ctx.lineTo(pixelX + cellSize, pixelY + cellSize);
        ctx.closePath();
        break;
        
      case 'bl': // Bottom-left: bridge curves outward toward bottom-left
        ctx.moveTo(pixelX, pixelY + cellSize - r);
        ctx.quadraticCurveTo(pixelX, pixelY + cellSize, pixelX + r, pixelY + cellSize);
        ctx.lineTo(pixelX, pixelY + cellSize);
        ctx.closePath();
        break;
    }
    
    ctx.fill();
  }

  // Draw complete tile with body and diagonal bridges
  drawOptimizedTile(ctx, pixelX, pixelY, cellSize, 
                    hasTop, hasRight, hasBottom, hasLeft,
                    hasTL, hasTR, hasBR, hasBL,
                    fillColor, hasHole) {
    ctx.fillStyle = fillColor;
    
    // Draw main tile body
    this.drawTileBody(ctx, pixelX, pixelY, cellSize, hasTop, hasRight, hasBottom, hasLeft);
    
    // Draw diagonal bridges where needed
    // A bridge is needed when:
    // 1. There's a diagonal neighbor
    // 2. Neither adjacent cardinal neighbor exists (corner is rounded)
    
    if (hasTL && !hasTop && !hasLeft) {
      this.drawDiagonalBridge(ctx, pixelX, pixelY, cellSize, 'tl');
    }
    
    if (hasTR && !hasTop && !hasRight) {
      this.drawDiagonalBridge(ctx, pixelX, pixelY, cellSize, 'tr');
    }
    
    if (hasBR && !hasBottom && !hasRight) {
      this.drawDiagonalBridge(ctx, pixelX, pixelY, cellSize, 'br');
    }
    
    if (hasBL && !hasBottom && !hasLeft) {
      this.drawDiagonalBridge(ctx, pixelX, pixelY, cellSize, 'bl');
    }
    
    // Draw harbor hole if needed
    if (hasHole) {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(pixelX + cellSize / 2, pixelY + cellSize / 2, cellSize * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Optimized trail rendering
  renderTrails(sands, worldWidth, worldHeight, cellSize, colors) {
    const w = this.w;
    const trailPositions = [];
    
    for (let y = 0; y < worldHeight; y++) {
      for (let x = 0; x < worldWidth; x++) {
        if (sands[(y * w + x) * 4] === TRAIL_ELEMENT) {
          trailPositions.push({ x, y });
        }
      }
    }
    
    if (trailPositions.length === 0) return;
    
    const trailColor = colors[TRAIL_ELEMENT] || [0.6, 0.7, 0.8];
    const [h, s, l] = trailColor;
    const colorStr = `hsl(${h * 360}, ${s * 100}%, ${l * 100}%)`;
    
    const getKey = (x, y) => y * worldWidth + x;
    const trailMap = new Map();
    trailPositions.forEach(p => trailMap.set(getKey(p.x, p.y), p));
    
    const visited = new Set();
    const segments = [];
    
    for (const start of trailPositions) {
      const startKey = getKey(start.x, start.y);
      if (visited.has(startKey)) continue;
      
      const segment = [];
      const stack = [start];
      visited.add(startKey);
      
      while (stack.length > 0) {
        const current = stack.pop();
        segment.push(current);
        
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const key = getKey(current.x + dx, current.y + dy);
            if (trailMap.has(key) && !visited.has(key)) {
              visited.add(key);
              stack.push(trailMap.get(key));
            }
          }
        }
      }
      
      if (segment.length > 0) segments.push(segment);
    }
    
    const ctx = this.ctx;
    ctx.strokeStyle = colorStr;
    ctx.fillStyle = colorStr;
    ctx.lineWidth = cellSize * 0.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    for (const segment of segments) {
      if (segment.length === 1) {
        const p = segment[0];
        ctx.beginPath();
        ctx.arc(p.x * cellSize + cellSize / 2, p.y * cellSize + cellSize / 2, cellSize * 0.3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const ordered = this.orderPoints(segment);
        ctx.beginPath();
        ctx.moveTo(ordered[0].x * cellSize + cellSize / 2, ordered[0].y * cellSize + cellSize / 2);
        for (let i = 1; i < ordered.length; i++) {
          ctx.lineTo(ordered[i].x * cellSize + cellSize / 2, ordered[i].y * cellSize + cellSize / 2);
        }
        ctx.stroke();
      }
    }
  }

  orderPoints(points) {
    if (points.length <= 2) return points;
    
    const ordered = [points[0]];
    const remaining = new Set(points.slice(1));
    
    while (remaining.size > 0) {
      const last = ordered[ordered.length - 1];
      let nearest = null, nearestDist = Infinity;
      
      for (const p of remaining) {
        const dist = Math.abs(p.x - last.x) + Math.abs(p.y - last.y);
        if (dist < nearestDist) { nearestDist = dist; nearest = p; }
      }
      
      if (nearest && nearestDist <= 2) {
        ordered.push(nearest);
        remaining.delete(nearest);
      } else {
        const next = remaining.values().next().value;
        ordered.push(next);
        remaining.delete(next);
      }
    }
    
    return ordered;
  }

  render(sands, worldWidth, worldHeight) {
    const { colors, color2s } = useStore.getState();
    const ctx = this.ctx;
    const w = this.w;
    
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    const cellSize = Math.min(this.canvas.width / worldWidth, this.canvas.height / worldHeight);

    // Render rounded corner tiles
    for (let y = 0; y < worldHeight; y++) {
      for (let x = 0; x < worldWidth; x++) {
        const elementType = sands[(y * w + x) * 4];
        
        if (!ROUNDED_CORNER_ELEMENTS.has(elementType)) continue;
        
        const pixelX = x * cellSize;
        const pixelY = y * cellSize;
        
        // Get cardinal neighbors
        const hasTop = this.hasSolid(sands, x, y - 1, worldWidth, worldHeight);
        const hasRight = this.hasSolid(sands, x + 1, y, worldWidth, worldHeight);
        const hasBottom = this.hasSolid(sands, x, y + 1, worldWidth, worldHeight);
        const hasLeft = this.hasSolid(sands, x - 1, y, worldWidth, worldHeight);
        
        // Get diagonal neighbors
        const hasTL = this.hasSolid(sands, x - 1, y - 1, worldWidth, worldHeight);
        const hasTR = this.hasSolid(sands, x + 1, y - 1, worldWidth, worldHeight);
        const hasBR = this.hasSolid(sands, x + 1, y + 1, worldWidth, worldHeight);
        const hasBL = this.hasSolid(sands, x - 1, y + 1, worldWidth, worldHeight);
        
        const fillColor = FILL_COLORS[elementType];
        const hasHole = HOLE_ELEMENTS.has(elementType);
        
        this.drawOptimizedTile(ctx, pixelX, pixelY, cellSize, 
          hasTop, hasRight, hasBottom, hasLeft,
          hasTL, hasTR, hasBR, hasBL,
          fillColor, hasHole);
      }
    }

    // Render trails
    this.renderTrails(sands, worldWidth, worldHeight, cellSize, colors);

    // Render other elements
    for (let y = 0; y < worldHeight; y++) {
      for (let x = 0; x < worldWidth; x++) {
        const index = (y * w + x) * 4;
        const elementType = sands[index];
        
        if (elementType === 0 || ROUNDED_CORNER_ELEMENTS.has(elementType) || elementType === TRAIL_ELEMENT) continue;
        
        const pixelX = x * cellSize;
        const pixelY = y * cellSize;
        
        if (elementType === 4 && this.svgImages.has(4)) {
          ctx.drawImage(this.svgImages.get(4), pixelX, pixelY, cellSize, cellSize);
        } else if (elementType === SHIP_ELEMENT) {
          ctx.fillStyle = '#0066FF';
          ctx.beginPath();
          const cx = pixelX + cellSize / 2, cy = pixelY + cellSize / 2, hs = cellSize / 2;
          ctx.moveTo(cx, cy - hs);
          ctx.lineTo(cx + hs, cy);
          ctx.lineTo(cx, cy + hs);
          ctx.lineTo(cx - hs, cy);
          ctx.closePath();
          ctx.fill();
        } else {
          const color = colors[elementType] || [0.5, 0.5, 0.5];
          const color2 = color2s[elementType] || [0.5, 0.5, 0.5];
          const ra = (sands[index + 1] || 50) / 100;
          const h = color[0] * (1 - ra) + color2[0] * ra;
          const s = color[1] * (1 - ra) + color2[1] * ra;
          const l = color[2] * (1 - ra) + color2[2] * ra;
          ctx.fillStyle = `hsl(${h * 360}, ${s * 100}%, ${l * 100}%)`;
          ctx.fillRect(pixelX, pixelY, cellSize, cellSize);
        }
      }
    }
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
