import React, { useRef, useEffect, useState } from 'react';
import { width, height, sands } from './SandApi';
import useStore from '../store';

// Map element indices to SVG files - these correspond to our specialized elements
const SVG_ELEMENTS = {
  4: 'city',        // City element
  5: 'harbor',      // Harbor element  
  6: 'homeharbor',  // Home Harbor element
  7: 'homeisland',  // Home Island element
  8: 'island'       // Island element
};

// Special elements that need custom rendering
const SHIP_ELEMENT = 9;  // Ship element
const TRAIL_ELEMENT = 10; // Trail element

const HybridRender = ({ worldScale }) => {
  const canvasRef = useRef(null);
  const svgCache = useRef({});
  const imageCache = useRef({});
  const [loaded, setLoaded] = useState(false);
  
  // Load SVG files and cache them as images
  useEffect(() => {
    const loadSvgs = async () => {
      const promises = Object.entries(SVG_ELEMENTS).map(async ([elementId, svgName]) => {
        try {
          const response = await fetch(`/svgs/${svgName}.svg`);
          const svgText = await response.text();
          svgCache.current[elementId] = svgText;
          
          // Pre-create image for better performance
          const img = new Image();
          const svgBlob = new Blob([svgText], { type: 'image/svg+xml' });
          const url = URL.createObjectURL(svgBlob);
          
          return new Promise((resolve) => {
            img.onload = () => {
              imageCache.current[elementId] = img;
              URL.revokeObjectURL(url);
              resolve();
            };
            img.onerror = () => {
              console.error(`Failed to load image for ${svgName} (element ${elementId})`);
              resolve();
            };
            img.src = url;
          });
        } catch (error) {
          console.warn(`Failed to load SVG for ${svgName} (element ${elementId}):`, error);
        }
      });
      
      await Promise.all(promises);
      setLoaded(true);
    };
    loadSvgs();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const pixelSize = Math.max(1, worldScale);
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Harbor hole diameter is 8 pixels (radius 4), use this for circle diameter
    const circleRadius = Math.min(4, pixelSize / 2);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        const elementId = sands[index];
        
        if (elementId === 0) continue; // Skip empty cells
        
        const pixelX = x * pixelSize;
        const pixelY = y * pixelSize;
        
        if (SVG_ELEMENTS[elementId]) {
          // Render SVG elements for specialized tiles
          const img = imageCache.current[elementId];
          
          if (img) {
            // Special handling for island element - render as pure black
            if (elementId === 8) { // Island element
              ctx.fillStyle = '#000000';
              ctx.fillRect(pixelX, pixelY, pixelSize, pixelSize);
            } else {
              ctx.drawImage(img, pixelX, pixelY, pixelSize, pixelSize);
            }
          } else {
            // Fallback to colored rectangle if SVG not loaded
            const colors = useStore.getState().colors;
            const color = colors[elementId] || [0.5, 0.5, 0.5];
            const [h, s, l] = color;
            ctx.fillStyle = `hsl(${h * 360}, ${s * 100}%, ${l * 100}%)`;
            ctx.fillRect(pixelX, pixelY, pixelSize, pixelSize);
          }
        } else {
          // Render other elements as circles with color variability
          const colors = useStore.getState().colors;
          const color2s = useStore.getState().color2s;
          const color = colors[elementId] || [0.5, 0.5, 0.5];
          const color2 = color2s[elementId] || [0.5, 0.5, 0.5];
          
          // Add some variability by mixing the two colors based on random data
          const ra = sands[index + 1] / 100; // Normalize random data (0-1)
          const mixedColor = [
            color[0] * (1 - ra) + color2[0] * ra,
            color[1] * (1 - ra) + color2[1] * ra,
            color[2] * (1 - ra) + color2[2] * ra
          ];
          
          const [h, s, l] = mixedColor;
          ctx.fillStyle = `hsl(${h * 360}, ${s * 100}%, ${l * 100}%)`;
          ctx.beginPath();
          ctx.arc(
            pixelX + pixelSize / 2, 
            pixelY + pixelSize / 2, 
            circleRadius, 
            0, 
            2 * Math.PI
          );
          ctx.fill();
        }
      }
    }
  }, [loaded, worldScale]);

  return (
    <canvas
      ref={canvasRef}
      width={width * worldScale}
      height={height * worldScale}
      style={{
        imageRendering: 'pixelated',
        width: '100%',
        height: '100%',
        display: 'block'
      }}
    />
  );
};

export default HybridRender;