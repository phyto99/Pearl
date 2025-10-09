import { useStore } from "../store";

class SvgRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.svgImages = new Map();
    this.loadingSvgs = false;
    this.svgsLoaded = false;
    
    this.initializeSvgs();
  }

  async initializeSvgs() {
    if (this.loadingSvgs) return;
    this.loadingSvgs = true;

    const svgFiles = {
      4: 'city',
      5: 'harbor', 
      6: 'homeharbor',
      7: 'homeisland',
      8: 'island'
    };

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
            
            img.onerror = () => {
              console.warn(`Failed to load SVG for element ${elementId}`);
              resolve();
            };
            
            img.src = url;
          })
          .catch(() => {
            console.warn(`Failed to fetch SVG for element ${elementId}`);
            resolve();
          });
      });
    });

    await Promise.all(loadPromises);
    this.svgsLoaded = true;
  }

  render(sands, worldWidth, worldHeight, scale = 1) {
    const { colors, color2s } = useStore.getState();
    
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Calculate cell size based on canvas size and world dimensions
    const cellWidth = this.canvas.width / worldWidth;
    const cellHeight = this.canvas.height / worldHeight;
    const cellSize = Math.min(cellWidth, cellHeight);

    for (let y = 0; y < worldHeight; y++) {
      for (let x = 0; x < worldWidth; x++) {
        const index = (y * 300 + x) * 4; // Use fixed width of 300 from SandApi
        const elementType = sands[index];
        
        if (elementType === 0) continue; // Skip empty cells
        
        const pixelX = x * cellSize;
        const pixelY = y * cellSize;
        
        // Handle specialized SVG elements (4-8)
        if (elementType >= 4 && elementType <= 8) {
          if (elementType === 8) {
            // Island element - render as pure black rectangle (wall behavior)
            this.ctx.fillStyle = '#000000';
            this.ctx.fillRect(pixelX, pixelY, cellSize, cellSize);
          } else if (this.svgImages.has(elementType)) {
            // Render SVG elements
            const img = this.svgImages.get(elementType);
            this.ctx.drawImage(img, pixelX, pixelY, cellSize, cellSize);
          } else {
            // Fallback to colored rectangle
            this.renderColoredRect(pixelX, pixelY, cellSize, elementType, colors, color2s, sands, index);
          }
        } else if (elementType === 9) {
          // Ship element - render as blue diamond
          this.renderShip(pixelX, pixelY, cellSize);
        } else if (elementType === 10) {
          // Trail element - render as white rectangle (wall behavior)
          this.ctx.fillStyle = '#FFFFFF';
          this.ctx.fillRect(pixelX, pixelY, cellSize, cellSize);
        } else {
          // Regular elements - render with color variation
          this.renderColoredRect(pixelX, pixelY, cellSize, elementType, colors, color2s, sands, index);
        }
      }
    }
  }

  renderColoredRect(x, y, size, elementType, colors, color2s, sands, index) {
    const color = colors[elementType] || [0.5, 0.5, 0.5];
    const color2 = color2s[elementType] || [0.5, 0.5, 0.5];
    
    // Add color variation based on random data
    const ra = (sands[index + 1] || 50) / 100;
    const mixedColor = [
      color[0] * (1 - ra) + color2[0] * ra,
      color[1] * (1 - ra) + color2[1] * ra,
      color[2] * (1 - ra) + color2[2] * ra
    ];
    
    const [h, s, l] = mixedColor;
    this.ctx.fillStyle = `hsl(${h * 360}, ${s * 100}%, ${l * 100}%)`;
    this.ctx.fillRect(x, y, size, size);
  }

  renderShip(x, y, size) {
    // Render ship as blue diamond
    this.ctx.fillStyle = '#0066FF';
    this.ctx.beginPath();
    
    const centerX = x + size / 2;
    const centerY = y + size / 2;
    const halfSize = size / 2;
    
    // Draw diamond shape
    this.ctx.moveTo(centerX, centerY - halfSize); // Top
    this.ctx.lineTo(centerX + halfSize, centerY); // Right
    this.ctx.lineTo(centerX, centerY + halfSize); // Bottom
    this.ctx.lineTo(centerX - halfSize, centerY); // Left
    this.ctx.closePath();
    this.ctx.fill();
  }

  renderCircle(x, y, diameter, color) {
    const centerX = x + diameter / 2;
    const centerY = y + diameter / 2;
    const radius = diameter / 2;
    
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    this.ctx.fillStyle = color;
    this.ctx.fill();
  }
}

// Create a function that mimics the WebGL render interface
export function startSvgGL({ canvas, width, height, sands }) {
  const renderer = new SvgRenderer(canvas);
  
  return {
    render: () => {
      const { worldWidth, worldHeight, worldScale } = useStore.getState();
      renderer.render(sands, worldWidth, worldHeight, worldScale);
    },
    renderer
  };
}

export default SvgRenderer;