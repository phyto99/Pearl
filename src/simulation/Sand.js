import React, { useEffect, useState, useCallback, useRef } from "react";
import useAnimationFrame from "use-animation-frame";
import useSound from "use-sound";
import { startWebGL } from "./Render";
import { startSvgGL } from "./SvgRender";
import useStore, { globalState, MAX_ELEMENTS } from "../store";
import { fps } from "./fps";
import { WrappedElementButtons } from "../simulation-controls/ElementButtons";
import ExtraUI from "../simulation-controls/ExtraUI";

import {
  useQueryParams,
  StringParam,
  withDefault,
  BooleanParam,
} from "next-query-params";

import { sands, trails, width, height, tick, initSand, pushUndo } from "./SandApi";

// Element indices (must match starterblocks.js order)
const ELEM_SHIP = 9;
const ELEM_TRAIL = 10;
const ELEM_HARBOR = 5;
const ELEM_HOME_HARBOR = 6;
import { pointsAlongLine } from "../utils/utils";
import LoadingCurtain from "../pages/loadingCurtain.js";
let dpi = 4;

// Viewport wrapper - applies zoom/pan transform to canvas only
// Controls: scroll wheel = zoom, right-click drag = pan, 0 = reset
const CanvasViewport = React.forwardRef(({ children, onCanvasEvent }, ref) => {
  const containerRef = useRef(null);
  const cameraZoom = useStore((state) => state.cameraZoom);
  const cameraX = useStore((state) => state.cameraX);
  const cameraY = useStore((state) => state.cameraY);
  const setCameraZoom = useStore((state) => state.setCameraZoom);
  const setCameraPosition = useStore((state) => state.setCameraPosition);
  
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, camX: 0, camY: 0 });

  // Scroll wheel = zoom (no modifier needed)
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.25, Math.min(5, cameraZoom * delta));
    setCameraZoom(newZoom);
  }, [cameraZoom, setCameraZoom]);

  // Right-click drag = pan
  const handleMouseDown = useCallback((e) => {
    if (e.button === 2) { // Right mouse button
      e.preventDefault();
      setIsPanning(true);
      panStartRef.current = { x: e.clientX, y: e.clientY, camX: cameraX, camY: cameraY };
    }
  }, [cameraX, cameraY]);

  const handleMouseMove = useCallback((e) => {
    if (isPanning) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setCameraPosition(panStartRef.current.camX + dx, panStartRef.current.camY + dy);
    }
  }, [isPanning, setCameraPosition]);

  const handleMouseUp = useCallback((e) => {
    if (e.button === 2) setIsPanning(false);
  }, []);

  // Prevent context menu on right-click
  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
  }, []);

  // Reset camera with 0 key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '0' && !e.ctrlKey && !e.metaKey) {
        useStore.getState().resetCamera();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      container.addEventListener('contextmenu', handleContextMenu);
      return () => {
        container.removeEventListener('wheel', handleWheel);
        container.removeEventListener('contextmenu', handleContextMenu);
      };
    }
  }, [handleWheel, handleContextMenu]);

  return (
    <div
      ref={containerRef}
      style={{
        overflow: 'hidden',
        position: 'relative',
        width: '100%',
        aspectRatio: '1',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => setIsPanning(false)}
    >
      <div
        style={{
          transform: `translate(${cameraX}px, ${cameraY}px) scale(${cameraZoom})`,
          transformOrigin: 'center center',
          width: '100%',
          height: '100%',
        }}
      >
        {children}
      </div>
    </div>
  );
});

// Initialize updaters array - will be populated by generateCode
globalState.updaters = Array(MAX_ELEMENTS).fill(null).map(() => {
  return (() => {}).bind(globalState);
});
let holdInterval = null;
let prevPos = [0, 0];
let sI = 0;
const Sand = () => {
  const [query, setQuery] = useQueryParams({
    edit: withDefault(BooleanParam, false),
  });
  const playMode = !query.edit;
  const appMode = useStore((state) => state.appMode);

  let starterWidth = 700;
  let mobile = false;
  const resize = () => {
    starterWidth = Math.min(window.innerWidth / 2, window.innerHeight * 0.6);
    mobile = false;
    if (window.innerWidth <= 700) {
      starterWidth = window.innerWidth - 6;
      mobile = true;
    }
  };
  resize();

  const [play] = useSound("/media/clave1.wav", {
    volume: 0.15,
  });

  // const [play2] = useSound("/media/clave1.wav", {
  //   volume: 0.01,
  // });
  const [play2] = useSound("/media/clave1.wav", {
    volume: 0.05,
  });
  const selectedElement = useStore((state) => state.selectedElement);
  const updateScheme = useStore((state) => state.updateScheme);
  const taggedMode = useStore((state) => state.taggedMode);
  const setSelected = useStore((state) => state.setSelected);
  const setUpdateScheme = useStore((state) => state.setUpdateScheme);
  const setTaggedMode = useStore((state) => state.setTaggedMode);

  const searchParams = new URLSearchParams(window.location.search);
  if (searchParams.has("bench")) {
    globalState.updateScheme = "BENCHMARK";
  }

  const canvas = React.useRef();
  const drawer = React.useRef();
  const [isDrawing, setIsDrawing] = useState(false);
  React.useEffect(() => {
    // Use SVG rendering for specialized elements
    drawer.current = startSvgGL({
      canvas: canvas.current,
      width,
      height,
      sands,
      trails,
    }).render;
  });

  useEffect(() => {
    globalState.updateScheme = updateScheme;
    globalState.taggedMode = taggedMode;
  }, [selectedElement, updateScheme, taggedMode]);

  const [tickAccumulator, setTickAccumulator] = useState(0);
  
  useAnimationFrame((e) => {
    if (useStore.getState().paused) {
      drawer?.current();
      return;
    }
    
    // Handle ship movement every frame (for instant key press response)
    if (typeof globalState.handleShipMovement === 'function') {
      globalState.handleShipMovement();
    }
    
    const tickSpeed = useStore.getState().tickSpeed || 1;
    const newAccumulator = tickAccumulator + tickSpeed;
    
    // Run tick(s) when accumulator reaches 1 or more
    if (newAccumulator >= 1) {
      const ticksToRun = Math.floor(newAccumulator);
      for (let i = 0; i < ticksToRun; i++) {
        const t0 = performance.now();
        tick(drawer);
        const t1 = performance.now();
        let d = t1 - t0;
        fps.render(d);
      }
      setTickAccumulator(newAccumulator - ticksToRun);
    } else {
      setTickAccumulator(newAccumulator);
    }
    
    drawer?.current();
  }, [tickAccumulator]);

  const [drawerWidth, setWidth] = useState(starterWidth);
  const [isDragging, setIsDragging] = useState(false);
  let mouseMove = useCallback((e) => {
    e.preventDefault();
    let x = window.innerWidth - e.pageX;
    setWidth(x);
  }, []);
  let mouseUp = useCallback(
    (e) => {
      setIsDragging(false);
      clearInterval(holdInterval);
      setIsDrawing(false);
    },
    [setIsDragging]
  );

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", mouseMove);
    }
    window.addEventListener("mouseup", mouseUp);

    return () => {
      window.removeEventListener("mousemove", mouseMove);
      window.removeEventListener("mouseup", mouseUp);
    };
  }, [isDragging]);

  useEffect(() => {
    window.addEventListener("resize", () => {
      resize();
      setWidth(starterWidth);
    });
    return () => {
      window.removeEventListener("resize", resize);
    };
  });

  let mouseMoveCanvas = useCallback(
    (e, force = false) => {
      let bounds = canvas.current.getBoundingClientRect();
      const { worldWidth, worldHeight, cameraZoom } = useStore.getState();
      
      // Adjust cell size for zoom
      const cellWidth = (bounds.width - 6 * cameraZoom) / worldWidth;
      const cellHeight = (bounds.height - 6 * cameraZoom) / worldHeight;
      let eX = Math.floor((e.clientX - 3 * cameraZoom - bounds.left) / cellWidth);
      let eY = Math.floor((e.clientY - 3 * cameraZoom - bounds.top) / cellHeight);
      
      let { size, setPos } = useStore.getState();
      setPos([eX, eY]);
      if (!isDrawing && !force) {
        return;
      }
      let points = pointsAlongLine(prevPos[0], prevPos[1], eX, eY, 1);
      globalState.tNoise += 0.05;

      const { appMode, gameStarted } = useStore.getState();

      // Mapmaker: block ship and trail placement
      if (appMode === "mapmaker" && (selectedElement === ELEM_SHIP || selectedElement === ELEM_TRAIL)) {
        return;
      }

      // Game mode: block all drawing once simulation has started
      if (appMode === "game" && gameStarted) {
        return;
      }

      // Game mode placement phase: only allow ship placement
      if (appMode === "game" && selectedElement !== ELEM_SHIP) {
        return;
      }

      points.forEach(({ x, y }, i) => {
        if (i == 0 && (sI % 4 == 0 || force)) {
          play2({
            playbackRate:
              (0.7 + selectedElement / 10 + Math.sin((x + y) / 10) * 0.5) /
              ((size + 5) / 5),
          });
        }

        let r = size / 2;
        for (let dx = -r; dx <= r; dx += 1) {
          for (let dy = -r; dy <= r; dy += 1) {
            let rr = dx * dx + dy * dy;
            if (rr > r * r) {
              continue;
            }
            const px = Math.floor(x + dx);
            const py = Math.floor(y + dy);

            // Game mode: ship can only be placed on harbor or home harbor
            if (appMode === "game" && selectedElement === ELEM_SHIP) {
              const cellIndex = (px + py * width) * 4;
              const cellElement = sands[cellIndex];
              if (cellElement !== ELEM_HARBOR && cellElement !== ELEM_HOME_HARBOR) {
                continue;
              }
            }

            initSand([px, py], selectedElement, [dx * 4, dy * 4]);
          }
        }
      });
      sI++;

      prevPos = [eX, eY];
      clearInterval(holdInterval);
      holdInterval = setInterval(() => {
        mouseMoveCanvas(e, true);
      }, 60);
    },
    [isDrawing, selectedElement]
  );

  return (
    <div id="world" style={{ width: playMode ? starterWidth : drawerWidth }}>
      <LoadingCurtain />
      <div
        className="resizeHandle"
        style={{
          display: playMode ? "none" : "",
        }}
        onMouseDown={() => {
          setIsDragging(true);
        }}
      ></div>
      {appMode === "mapmaker" && (
        <button
          className="editor-toggle"
          style={{
            position: "absolute",
            left: -8,
            zIndex: 9000,
            transform: "translateX(-100%)",
          }}
          onClick={(e) => {
            play();
            setQuery({ edit: playMode ? 1 : undefined });
          }}
        >
          {playMode ? "<-  Open Editor " : "-> Close Editor"}
        </button>
      )}
      <WrappedElementButtons
        selectedElement={selectedElement}
        setSelected={setSelected}
      />
      <CanvasViewport>
        <canvas
          id="worldCanvas"
          onMouseDown={(e) => {
            // Ignore middle mouse button (used for panning)
            if (e.button === 1) return;
            
            let bounds = canvas.current.getBoundingClientRect();
            const { worldWidth, worldHeight, cameraZoom } = useStore.getState();
            const cellWidth = (bounds.width - 6 * cameraZoom) / worldWidth;
            const cellHeight = (bounds.height - 6 * cameraZoom) / worldHeight;
            let eX = Math.floor((e.clientX - 3 * cameraZoom - bounds.left) / cellWidth);
            let eY = Math.floor((e.clientY - 3 * cameraZoom - bounds.top) / cellHeight);

            prevPos = [eX, eY];
            pushUndo();
            setIsDrawing(true);
            clearInterval(holdInterval);
            holdInterval = setInterval(() => {
              mouseMoveCanvas(e, true);
            }, 60);
            mouseMoveCanvas(e, true);
          }}
          onMouseOut={() => {
            clearInterval(holdInterval);
            let { setPos } = useStore.getState();
            setPos([-1, -1]);
          }}
          onMouseMove={mouseMoveCanvas}
          onTouchStart={(e) => {
            let touches = Array.from(e.touches);
            if (touches.length < 1) {
              return;
            }
            let touch = touches[0];

            let bounds = canvas.current.getBoundingClientRect();
            const { worldWidth, worldHeight, cameraZoom } = useStore.getState();
            const cellWidth = (bounds.width - 6 * cameraZoom) / worldWidth;
            const cellHeight = (bounds.height - 6 * cameraZoom) / worldHeight;
            let eX = Math.floor((touch.clientX - 3 * cameraZoom - bounds.left) / cellWidth);
            let eY = Math.floor((touch.clientY - 3 * cameraZoom - bounds.top) / cellHeight);
            pushUndo();
            clearInterval(holdInterval);
            e.clientX = touch.clientX;
            e.clientY = touch.clientY;
            holdInterval = setInterval(() => {
              mouseMoveCanvas(e, true);
            }, 60);
            prevPos = [eX, eY];
          }}
          onTouchEnd={() => {
            clearInterval(holdInterval);
          }}
          onTouchMove={(e) => {
            let touches = Array.from(e.touches);
            if (touches.length !== 1) {
              return;
            }
            e.preventDefault();

            let touch = touches[0];
            e.clientX = touch.clientX;
            e.clientY = touch.clientY;
            setIsDrawing(true);
            mouseMoveCanvas(e);
            clearInterval(holdInterval);
            holdInterval = setInterval(() => {
              mouseMoveCanvas(e, true);
            }, 60);
          }}
          ref={canvas}
          height={height * dpi}
          width={width * dpi}
        />
      </CanvasViewport>

      <ExtraUI
        playMode={playMode}
        updateScheme={updateScheme}
        setUpdateScheme={setUpdateScheme}
        taggedMode={taggedMode}
        setTaggedMode={setTaggedMode}
      />
      {!playMode && mobile && (
        <h2> &nbsp; To edit elements, use a bigger screen!</h2>
      )}
    </div>
  );
};

Sand.propTypes = {};
export default Sand;
