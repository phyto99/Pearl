import { useStore } from "../store";

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
      5: '/svgs/harbor.svg',    // Harbor element (index 5)
      6: '/svgs/homeharbor.svg', // Home Harbor element (index 6)
      7: '/svgs/homeisland.svg', // Home Island element (index 7)
      8: '/svgs/island.svg'     // Island element (index 8)
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

  applyRoundedCorners(x, y, neighbors) {
    // Implementation for rounded corners based on neighboring tiles
    // This is a simplified version - can be enhanced later
    const pixelX = x * this.tileSize;
    const pixelY = y * this.tileSize;
    
    // Check neighbors and apply corner rounding logic
    // For now, just ensure smooth edges
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'source-atop';
    
    // Apply subtle corner rounding
    const cornerRadius = 1;
    this.ctx.beginPath();
    this.ctx.roundRect(pixelX, pixelY, this.tileSize, this.tileSize, cornerRadius);
    this.ctx.clip();
    
    this.ctx.restore();
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  render(sands, worldWidth, worldHeight) {
    this.clear();
    
    const colors = useStore.getState().colors;
    const color2s = useStore.getState().color2s;
    
    for (let x = 0; x < worldWidth; x++) {
      for (let y = 0; y < worldHeight; y++) {
        const index = (x + y * this.width) * 4;
        const elementType = sands[index];
        
        if (elementType > 0) {
          const colorData = colors[elementType] || [0.5, 0.5, 0.5];
          const [h, s, l] = colorData;
          const color = `hsl(${h * 360}, ${s * 100}%, ${l * 100}%)`;
          
          // Special handling for specialized elements
          if (elementType >= 4 && elementType <= 8) {
            // These are our specialized tile elements
            this.renderTile(x, y, elementType, color);
          } else {
            // Regular elements - render as rectangles
            this.renderTile(x, y, elementType, color);
          }
        }
      }
    }
  }
}

export default SvgTileRenderer;