import { useStore } from "../store";
import { getIndex, sands } from "./SandApi";

// Elements that need rounded corner treatment (solid land tiles)
const ROUNDED_CORNER_ELEMENTS = new Set([2, 3, 4, 5, 6]); // city, harbor, homeharbor, homeisland, island
const TRAIL_ELEMENT = 8;

// Helper to check if an element is a "solid" tile for corner calculations
const isSolidTile = (elementId) => ROUNDED_CORNER_ELEMENTS.has(elementId);

class SvgTileRenderer {
  constructor(canvas, width, height) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = width;
    this.height = height;
    this.tileSize = 4; // Match current pixel system
    this.svgCache = new Map();
    this.loadedSvgs = new Map();
    
    // Initialize SVG loading
    this.initializeSvgs();
  }

  async initializeSvgs() {
    const svgFiles = {
      4: '/svgs/city.svg',      // City element (index 4)
    };

    for (const [elementId, svgPath] of Object.entries(svgFiles)) {
      try {
        const response = await fetch(svgPath);
        const svgText = await response.text();
        const img = new Image();
        const svgBlob = new Blob([svgText], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(svgBlob);
        
        img.onload = () => {
          this.loadedSvgs.set(parseInt(elementId), img);
          URL.revokeObjectURL(url);
        };
        
        img.src = url;
      } catch (error) {
        console.warn(`Failed to load SVG for element ${elementId}:`, error);
      }
    }
  }

  // Get neighbor configuration for marching squares (4-bit: top, right, bottom, left)
  getNeighborMask(x, y, worldWidth, worldHeight, sandsData) {
    let mask = 0;
    
    if (y > 0 && isSolidTile(sandsData[getIndex(x, y - 1)])) mask |= 0b1000;
    if (x < worldWidth - 1 && isSolidTile(sandsData[getIndex(x + 1, y)])) mask |= 0b0100;
    if (y < worldHeight - 1 && isSolidTile(sandsData[getIndex(x, y + 1)])) mask |= 0b0010;
    if (x > 0 && isSolidTile(sandsData[getIndex(x - 1, y)])) mask |= 0b0001;
    
    return mask;
  }

  // Get diagonal neighbor configuration
  getDiagonalMask(x, y, worldWidth, worldHeight, sandsData) {
    let mask = 0;
    
    if (y > 0 && x > 0 && isSolidTile(sandsData[getIndex(x - 1, y - 1)])) mask |= 0b1000;
    if (y > 0 && x < worldWidth - 1 && isSolidTile(sandsData[getIndex(x + 1, y - 1)])) mask |= 0b0100;
    if (y < worldHeight - 1 && x < worldWidth - 1 && isSolidTile(sandsData[getIndex(x + 1, y + 1)])) mask |= 0b0010;
    if (y < worldHeight - 1 && x > 0 && isSolidTile(sandsData[getIndex(x - 1, y + 1)])) mask |= 0b0001;
    
    return mask;
  }

  drawStar(cx, cy, outerR, innerR, points) {
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const px = cx + r * Math.cos(angle);
      const py = cy + r * Math.sin(angle);
      i === 0 ? this.ctx.moveTo(px, py) : this.ctx.lineTo(px, py);
    }
    this.ctx.closePath();
    this.ctx.fill();
  }

  // Draw a rounded corner tile based on neighbor configuration
  drawRoundedTile(x, y, neighborMask, diagonalMask, fillColor, holeType = null) {
    const pixelX = x * this.tileSize;
    const pixelY = y * this.tileSize;
    const pixelSize = this.tileSize;
    const cornerRadius = pixelSize * 0.4;
    
    this.ctx.fillStyle = fillColor;
    this.ctx.beginPath();
    
    const hasTop = (neighborMask & 0b1000) !== 0;
    const hasRight = (neighborMask & 0b0100) !== 0;
    const hasBottom = (neighborMask & 0b0010) !== 0;
    const hasLeft = (neighborMask & 0b0001) !== 0;
    
    const hasTopLeft = (diagonalMask & 0b1000) !== 0;
    const hasTopRight = (diagonalMask & 0b0100) !== 0;
    const hasBottomRight = (diagonalMask & 0b0010) !== 0;
    const hasBottomLeft = (diagonalMask & 0b0001) !== 0;
    
    // Top-left corner
    if (hasTop && hasLeft) {
      this.ctx.moveTo(pixelX, pixelY);
    } else if (hasTop || hasLeft || hasTopLeft) {
      this.ctx.moveTo(pixelX, pixelY);
    } else {
      this.ctx.moveTo(pixelX + cornerRadius, pixelY);
    }
    
    // Top-right corner
    if (hasTop && hasRight) {
      this.ctx.lineTo(pixelX + pixelSize, pixelY);
    } else if (hasTop || hasRight || hasTopRight) {
      this.ctx.lineTo(pixelX + pixelSize, pixelY);
    } else {
      this.ctx.lineTo(pixelX + pixelSize - cornerRadius, pixelY);
      this.ctx.quadraticCurveTo(pixelX + pixelSize, pixelY, pixelX + pixelSize, pixelY + cornerRadius);
    }
    
    // Bottom-right corner
    if (hasRight && hasBottom) {
      this.ctx.lineTo(pixelX + pixelSize, pixelY + pixelSize);
    } else if (hasRight || hasBottom || hasBottomRight) {
      this.ctx.lineTo(pixelX + pixelSize, pixelY + pixelSize);
    } else {
      this.ctx.lineTo(pixelX + pixelSize, pixelY + pixelSize - cornerRadius);
      this.ctx.quadraticCurveTo(pixelX + pixelSize, pixelY + pixelSize, pixelX + pixelSize - cornerRadius, pixelY + pixelSize);
    }
    
    // Bottom-left corner
    if (hasBottom && hasLeft) {
      this.ctx.lineTo(pixelX, pixelY + pixelSize);
    } else if (hasBottom || hasLeft || hasBottomLeft) {
      this.ctx.lineTo(pixelX, pixelY + pixelSize);
    } else {
      this.ctx.lineTo(pixelX + cornerRadius, pixelY + pixelSize);
      this.ctx.quadraticCurveTo(pixelX, pixelY + pixelSize, pixelX, pixelY + pixelSize - cornerRadius);
    }
    
    // Back to top-left
    if (hasLeft && hasTop) {
      this.ctx.lineTo(pixelX, pixelY);
    } else if (hasLeft || hasTop || hasTopLeft) {
      this.ctx.lineTo(pixelX, pixelY);
    } else {
      this.ctx.lineTo(pixelX, pixelY + cornerRadius);
      this.ctx.quadraticCurveTo(pixelX, pixelY, pixelX + cornerRadius, pixelY);
    }
    
    this.ctx.closePath();
    this.ctx.fill();
    
    // Draw interior mark
    const cx = pixelX + pixelSize / 2;
    const cy = pixelY + pixelSize / 2;
    if (holeType === 'circle') {
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, pixelSize * 0.3, 0, Math.PI * 2);
      this.ctx.fill();
    } else if (holeType === 'star') {
      this.drawStar(cx, cy, pixelSize * 0.38, pixelSize * 0.16, 5);
    }
  }

  renderTile(x, y, elementType, color) {
    const pixelX = x * this.tileSize;
    const pixelY = y * this.tileSize;
    
    // Check if this element has an SVG
    if (this.loadedSvgs.has(elementType)) {
      const img = this.loadedSvgs.get(elementType);
      this.ctx.drawImage(img, pixelX, pixelY, this.tileSize, this.tileSize);
    } else {
      // Fallback to colored rectangle for non-SVG elements
      this.ctx.fillStyle = color || '#ffffff';
      this.ctx.fillRect(pixelX, pixelY, this.tileSize, this.tileSize);
    }
  }

  renderCircle(x, y, diameter, color) {
    const pixelX = x * this.tileSize + this.tileSize / 2;
    const pixelY = y * this.tileSize + this.tileSize / 2;
    const radius = (diameter * this.tileSize) / 2;
    
    this.ctx.beginPath();
    this.ctx.arc(pixelX, pixelY, radius, 0, 2 * Math.PI);
    this.ctx.fillStyle = color || '#ffffff';
    this.ctx.fill();
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  render(sandsData, worldWidth, worldHeight) {
    this.clear();
    
    const colors = useStore.getState().colors;
    const color2s = useStore.getState().color2s;
    
    // First pass: render rounded corner tiles
    for (let y = 0; y < worldHeight; y++) {
      for (let x = 0; x < worldWidth; x++) {
        const index = getIndex(x, y);
        const elementType = sandsData[index];
        
        if (!ROUNDED_CORNER_ELEMENTS.has(elementType)) continue;
        
        const neighborMask = this.getNeighborMask(x, y, worldWidth, worldHeight, sandsData);
        const diagonalMask = this.getDiagonalMask(x, y, worldWidth, worldHeight, sandsData);
        
        let fillColor, holeType = null;

        if (elementType === 6) fillColor = '#000000';                              // Island
        else if (elementType === 5) fillColor = '#29FD2F';                         // Home Island
        else if (elementType === 2) { fillColor = '#000000'; holeType = 'star'; }  // City
        else if (elementType === 3) { fillColor = '#000000'; holeType = 'circle'; } // Harbor
        else if (elementType === 4) { fillColor = '#29FD2F'; holeType = 'circle'; } // Home Harbor

        this.drawRoundedTile(x, y, neighborMask, diagonalMask, fillColor, holeType);
      }
    }
    
    // Second pass: render trails as lines
    this.renderTrails(sandsData, worldWidth, worldHeight, colors, color2s);
    
    // Third pass: render other elements
    for (let y = 0; y < worldHeight; y++) {
      for (let x = 0; x < worldWidth; x++) {
        const index = getIndex(x, y);
        const elementType = sandsData[index];
        
        if (elementType === 0 || ROUNDED_CORNER_ELEMENTS.has(elementType) || elementType === TRAIL_ELEMENT) continue;
        
        const colorData = colors[elementType] || [0.5, 0.5, 0.5];
        const [h, s, l] = colorData;
        const color = `hsl(${h * 360}, ${s * 100}%, ${l * 100}%)`;
        
        if (elementType === 2) {  // City
          this.renderTile(x, y, elementType, color);
        } else {
          this.renderCircle(x, y, 0.6, color);
        }
      }
    }
  }

  renderTrails(sandsData, worldWidth, worldHeight, colors, color2s) {
    const trailPositions = [];
    
    for (let y = 0; y < worldHeight; y++) {
      for (let x = 0; x < worldWidth; x++) {
        const index = getIndex(x, y);
        if (sandsData[index] === TRAIL_ELEMENT) {
          trailPositions.push({ x, y });
        }
      }
    }
    
    if (trailPositions.length === 0) return;
    
    const trailColor = colors[TRAIL_ELEMENT] || [0.6, 0.7, 0.8];
    const [h, s, l] = trailColor;
    this.ctx.strokeStyle = `hsl(${h * 360}, ${s * 100}%, ${l * 100}%)`;
    this.ctx.lineWidth = this.tileSize * 0.6;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    
    // Simple rendering: draw each trail point
    for (const p of trailPositions) {
      this.ctx.fillStyle = this.ctx.strokeStyle;
      this.ctx.beginPath();
      this.ctx.arc(
        p.x * this.tileSize + this.tileSize / 2,
        p.y * this.tileSize + this.tileSize / 2,
        this.tileSize * 0.3,
        0,
        Math.PI * 2
      );
      this.ctx.fill();
    }
  }
}

export default SvgTileRenderer;