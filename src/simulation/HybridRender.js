import React, { useRef, useEffect, useState } from 'react';
import { width, height, sands, getIndex } from './SandApi';
import useStore from '../store';

// Map element indices to SVG files - these correspond to our specialized elements
const SVG_ELEMENTS = {
  4: 'city',        // City element
  5: 'harbor',      // Harbor element  
  6: 'homeharbor',  // Home Harbor element
  7: 'homeisland',  // Home Island element
  8: 'island'       // Island element
};

// Elements that need rounded corner treatment (solid land tiles)
const ROUNDED_CORNER_ELEMENTS = new Set([5, 6, 7, 8]); // harbor, homeharbor, homeisland, island

// Special elements that need custom rendering
const SHIP_ELEMENT = 9;  // Ship element
const TRAIL_ELEMENT = 10; // Trail element

// Helper to check if an element is a "solid" tile for corner calculations
const isSolidTile = (elementId) => ROUNDED_CORNER_ELEMENTS.has(elementId);

// Get neighbor configuration for marching squares (4-bit: top, right, bottom, left)
const getNeighborMask = (x, y, worldWidth, worldHeight) => {
  let mask = 0;
  
  // Top neighbor
  if (y > 0) {
    const topIdx = getIndex(x, y - 1);
    if (isSolidTile(sands[topIdx])) mask |= 0b1000;
  }
  // Right neighbor
  if (x < worldWidth - 1) {
    const rightIdx = getIndex(x + 1, y);
    if (isSolidTile(sands[rightIdx])) mask |= 0b0100;
  }
  // Bottom neighbor
  if (y < worldHeight - 1) {
    const bottomIdx = getIndex(x, y + 1);
    if (isSolidTile(sands[bottomIdx])) mask |= 0b0010;
  }
  // Left neighbor
  if (x > 0) {
    const leftIdx = getIndex(x - 1, y);
    if (isSolidTile(sands[leftIdx])) mask |= 0b0001;
  }
  
  return mask;
};

// Get diagonal neighbor configuration (4-bit: topLeft, topRight, bottomRight, bottomLeft)
const getDiagonalMask = (x, y, worldWidth, worldHeight) => {
  let mask = 0;
  
  // Top-left
  if (y > 0 && x > 0) {
    const idx = getIndex(x - 1, y - 1);
    if (isSolidTile(sands[idx])) mask |= 0b1000;
  }
  // Top-right
  if (y > 0 && x < worldWidth - 1) {
    const idx = getIndex(x + 1, y - 1);
    if (isSolidTile(sands[idx])) mask |= 0b0100;
  }
  // Bottom-right
  if (y < worldHeight - 1 && x < worldWidth - 1) {
    const idx = getIndex(x + 1, y + 1);
    if (isSolidTile(sands[idx])) mask |= 0b0010;
  }
  // Bottom-left
  if (y < worldHeight - 1 && x > 0) {
    const idx = getIndex(x - 1, y + 1);
    if (isSolidTile(sands[idx])) mask |= 0b0001;
  }
  
  return mask;
};

// Draw a rounded corner tile based on neighbor configuration
const drawRoundedTile = (ctx, x, y, pixelSize, neighborMask, diagonalMask, fillColor, holeColor = null) => {
  const cornerRadius = pixelSize * 0.4; // 40% of tile size for smooth corners
  
  ctx.fillStyle = fillColor;
  ctx.beginPath();
  
  // Start from top-left, going clockwise
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
    ctx.moveTo(x, y);
  } else if (hasTop || hasLeft || hasTopLeft) {
    ctx.moveTo(x, y);
  } else {
    ctx.moveTo(x + cornerRadius, y);
  }
  
  // Top edge to top-right corner
  if (hasTop && hasRight) {
    ctx.lineTo(x + pixelSize, y);
  } else if (hasTop || hasRight || hasTopRight) {
    ctx.lineTo(x + pixelSize, y);
  } else {
    ctx.lineTo(x + pixelSize - cornerRadius, y);
    ctx.quadraticCurveTo(x + pixelSize, y, x + pixelSize, y + cornerRadius);
  }
  
  // Right edge to bottom-right corner
  if (hasRight && hasBottom) {
    ctx.lineTo(x + pixelSize, y + pixelSize);
  } else if (hasRight || hasBottom || hasBottomRight) {
    ctx.lineTo(x + pixelSize, y + pixelSize);
  } else {
    ctx.lineTo(x + pixelSize, y + pixelSize - cornerRadius);
    ctx.quadraticCurveTo(x + pixelSize, y + pixelSize, x + pixelSize - cornerRadius, y + pixelSize);
  }
  
  // Bottom edge to bottom-left corner
  if (hasBottom && hasLeft) {
    ctx.lineTo(x, y + pixelSize);
  } else if (hasBottom || hasLeft || hasBottomLeft) {
    ctx.lineTo(x, y + pixelSize);
  } else {
    ctx.lineTo(x + cornerRadius, y + pixelSize);
    ctx.quadraticCurveTo(x, y + pixelSize, x, y + pixelSize - cornerRadius);
  }
  
  // Left edge back to top-left corner
  if (hasLeft && hasTop) {
    ctx.lineTo(x, y);
  } else if (hasLeft || hasTop || hasTopLeft) {
    ctx.lineTo(x, y);
  } else {
    ctx.lineTo(x, y + cornerRadius);
    ctx.quadraticCurveTo(x, y, x + cornerRadius, y);
  }
  
  ctx.closePath();
  ctx.fill();
  
  // Draw harbor hole if needed
  if (holeColor) {
    ctx.fillStyle = holeColor;
    ctx.beginPath();
    ctx.arc(x + pixelSize / 2, y + pixelSize / 2, pixelSize * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
};

// Build trail segments from trail positions for efficient line rendering
const buildTrailSegments = (worldWidth, worldHeight) => {
  const trailPositions = [];
  
  // Collect all trail positions
  for (let y = 0; y < worldHeight; y++) {
    for (let x = 0; x < worldWidth; x++) {
      const index = getIndex(x, y);
      if (sands[index] === TRAIL_ELEMENT) {
        trailPositions.push({ x, y, index });
      }
    }
  }
  
  if (trailPositions.length === 0) return [];
  
  // Build connected segments using flood-fill approach
  const visited = new Set();
  const segments = [];
  
  const getKey = (x, y) => `${x},${y}`;
  const trailSet = new Set(trailPositions.map(p => getKey(p.x, p.y)));
  
  // Find connected trail segments
  for (const start of trailPositions) {
    const startKey = getKey(start.x, start.y);
    if (visited.has(startKey)) continue;
    
    // BFS to find connected trail cells
    const segment = [];
    const queue = [start];
    visited.add(startKey);
    
    while (queue.length > 0) {
      const current = queue.shift();
      segment.push(current);
      
      // Check 8-directional neighbors
      const neighbors = [
        { x: current.x + 1, y: current.y },
        { x: current.x - 1, y: current.y },
        { x: current.x, y: current.y + 1 },
        { x: current.x, y: current.y - 1 },
        { x: current.x + 1, y: current.y + 1 },
        { x: current.x - 1, y: current.y - 1 },
        { x: current.x + 1, y: current.y - 1 },
        { x: current.x - 1, y: current.y + 1 },
      ];
      
      for (const neighbor of neighbors) {
        const key = getKey(neighbor.x, neighbor.y);
        if (trailSet.has(key) && !visited.has(key)) {
          visited.add(key);
          neighbor.index = getIndex(neighbor.x, neighbor.y);
          queue.push(neighbor);
        }
      }
    }
    
    if (segment.length > 0) {
      segments.push(segment);
    }
  }
  
  return segments;
};

// Draw trail as smooth connected lines
const drawTrailLines = (ctx, segments, pixelSize, colors, color2s) => {
  const trailColor = colors[TRAIL_ELEMENT] || [0.6, 0.7, 0.8];
  const trailColor2 = color2s[TRAIL_ELEMENT] || [0.5, 0.6, 0.9];
  
  const [h, s, l] = trailColor;
  ctx.strokeStyle = `hsl(${h * 360}, ${s * 100}%, ${l * 100}%)`;
  ctx.lineWidth = pixelSize * 0.6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  for (const segment of segments) {
    if (segment.length === 1) {
      // Single point - draw as small circle
      const p = segment[0];
      ctx.fillStyle = ctx.strokeStyle;
      ctx.beginPath();
      ctx.arc(
        p.x * pixelSize + pixelSize / 2,
        p.y * pixelSize + pixelSize / 2,
        pixelSize * 0.3,
        0,
        Math.PI * 2
      );
      ctx.fill();
    } else {
      // Sort segment points to create a path (simple nearest-neighbor ordering)
      const orderedPoints = orderTrailPoints(segment);
      
      ctx.beginPath();
      ctx.moveTo(
        orderedPoints[0].x * pixelSize + pixelSize / 2,
        orderedPoints[0].y * pixelSize + pixelSize / 2
      );
      
      for (let i = 1; i < orderedPoints.length; i++) {
        ctx.lineTo(
          orderedPoints[i].x * pixelSize + pixelSize / 2,
          orderedPoints[i].y * pixelSize + pixelSize / 2
        );
      }
      
      ctx.stroke();
    }
  }
};

// Order trail points using nearest-neighbor for smooth line drawing
const orderTrailPoints = (points) => {
  if (points.length <= 2) return points;
  
  const ordered = [points[0]];
  const remaining = new Set(points.slice(1));
  
  while (remaining.size > 0) {
    const last = ordered[ordered.length - 1];
    let nearest = null;
    let nearestDist = Infinity;
    
    for (const p of remaining) {
      const dist = Math.abs(p.x - last.x) + Math.abs(p.y - last.y);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = p;
      }
    }
    
    if (nearest && nearestDist <= 2) { // Only connect nearby points
      ordered.push(nearest);
      remaining.delete(nearest);
    } else {
      // Start a new segment from remaining points
      const next = remaining.values().next().value;
      ordered.push(next);
      remaining.delete(next);
    }
  }
  
  return ordered;
};

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
    const { worldWidth, worldHeight } = useStore.getState();
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const colors = useStore.getState().colors;
    const color2s = useStore.getState().color2s;
    
    // First pass: render rounded corner tiles (harbor, island, etc.)
    for (let y = 0; y < worldHeight; y++) {
      for (let x = 0; x < worldWidth; x++) {
        const index = getIndex(x, y);
        const elementId = sands[index];
        
        if (!ROUNDED_CORNER_ELEMENTS.has(elementId)) continue;
        
        const pixelX = x * pixelSize;
        const pixelY = y * pixelSize;
        
        const neighborMask = getNeighborMask(x, y, worldWidth, worldHeight);
        const diagonalMask = getDiagonalMask(x, y, worldWidth, worldHeight);
        
        // Determine fill color based on element type
        let fillColor, holeColor = null;
        
        if (elementId === 8) { // Island - black
          fillColor = '#000000';
        } else if (elementId === 7) { // Home Island - green
          fillColor = '#29FD2F';
        } else if (elementId === 5) { // Harbor - black with white hole
          fillColor = '#000000';
          holeColor = '#FFFFFF';
        } else if (elementId === 6) { // Home Harbor - green with white hole
          fillColor = '#29FD2F';
          holeColor = '#FFFFFF';
        }
        
        drawRoundedTile(ctx, pixelX, pixelY, pixelSize, neighborMask, diagonalMask, fillColor, holeColor);
      }
    }
    
    // Second pass: render trails as connected lines
    const trailSegments = buildTrailSegments(worldWidth, worldHeight);
    if (trailSegments.length > 0) {
      drawTrailLines(ctx, trailSegments, pixelSize, colors, color2s);
    }
    
    // Third pass: render other elements (ship, etc.)
    const circleRadius = Math.min(4, pixelSize / 2);
    
    for (let y = 0; y < worldHeight; y++) {
      for (let x = 0; x < worldWidth; x++) {
        const index = getIndex(x, y);
        const elementId = sands[index];
        
        // Skip empty, rounded corner elements, and trails (already rendered)
        if (elementId === 0 || ROUNDED_CORNER_ELEMENTS.has(elementId) || elementId === TRAIL_ELEMENT) continue;
        
        const pixelX = x * pixelSize;
        const pixelY = y * pixelSize;
        
        if (elementId === 4) { // City - use SVG
          const img = imageCache.current[elementId];
          if (img) {
            ctx.drawImage(img, pixelX, pixelY, pixelSize, pixelSize);
          } else {
            const color = colors[elementId] || [0.5, 0.5, 0.5];
            const [h, s, l] = color;
            ctx.fillStyle = `hsl(${h * 360}, ${s * 100}%, ${l * 100}%)`;
            ctx.fillRect(pixelX, pixelY, pixelSize, pixelSize);
          }
        } else {
          // Render other elements as circles with color variability
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