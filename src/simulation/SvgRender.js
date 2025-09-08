import React, { useRef, useEffect, useState } from 'react';
import { width, height, sands } from './SandApi';
import useStore from '../store';

const SVG_ELEMENTS = ['city', 'harbor', 'homeharbor', 'homeisland', 'island'];

const SvgRender = ({ worldScale }) => {
  const canvasRef = useRef(null);
  const svgCache = useRef({});
  const imageCache = useRef({});
  const [loaded, setLoaded] = useState(false);
  
  // Load SVG files and cache them as images
  useEffect(() => {
    const loadSvgs = async () => {
      const promises = SVG_ELEMENTS.map(async (element) => {
        try {
          const response = await fetch(`/svgs/${element}.svg`);
          const svgText = await response.text();
          svgCache.current[element] = svgText;
          
          // Pre-create image for better performance
          const img = new Image();
          const svgBlob = new Blob([svgText], { type: 'image/svg+xml' });
          const url = URL.createObjectURL(svgBlob);
          
          return new Promise((resolve) => {
            img.onload = () => {
              imageCache.current[element] = img;
              console.log(`Loaded SVG: ${element}`, img.width, img.height);
              URL.revokeObjectURL(url);
              resolve();
            };
            img.onerror = () => {
              console.error(`Failed to load image for ${element}`);
              resolve();
            };
            img.src = url;
          });
        } catch (error) {
          console.warn(`Failed to load SVG for ${element}:`, error);
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
    const pixelSize = Math.max(1, worldScale); // Use worldScale directly
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Get harbor hole diameter for circle size (4 pixels radius from SVG)
    const circleRadius = 4;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        const elementId = sands[index];
        
        if (elementId === 0) continue; // Skip empty cells
        
        const pixelX = x * pixelSize;
        const pixelY = y * pixelSize;
        
        if (elementId < 5 && SVG_ELEMENTS[elementId]) {
          // Render SVG elements (0-4 map to indices 0-4)
          const svgElement = SVG_ELEMENTS[elementId];
          const img = imageCache.current[svgElement];
          
          if (img) {
            ctx.drawImage(img, pixelX, pixelY, pixelSize, pixelSize);

          }
        } else {
          // Render other elements as circles
          const colors = useStore.getState().colors;
          const color = colors[elementId] || [0.5, 0.5, 0.5];
          const [h, s, l] = color;
          
          ctx.fillStyle = `hsl(${h * 360}, ${s * 100}%, ${l * 100}%)`;
          ctx.beginPath();
          ctx.arc(
            pixelX + pixelSize / 2, 
            pixelY + pixelSize / 2, 
            Math.min(circleRadius, pixelSize / 2), 
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

export default SvgRender;