import React, { useState } from "react";
import classNames from "classnames";
import { MAX_ELEMENTS, useStore } from "../store";
import useSound from "use-sound";

const ELEM_SHIP = 7;     // legacy ship element
const ELEM_TRAIL = 8;    // net trail
const SHIP_TYPES = [19, 20, 21];
const TRAIL_TYPES = [8, 24, 25];
// Indices hidden in mapmaker (game-only elements)
const MAPMAKER_HIDDEN = new Set([7, 8, 19, 20, 21, 24, 25]);

const ElementButton = ({
  i,
  elements,
  colors,
  color2s,
  setSelected,
  selected,
  shrink,
  inert,
}) => {
  const colorData1 = colors[i];
  const colorData2 = color2s[i];
  let [h, s, l] = colorData1 ?? [0, 0.5, 0.5];
  let [h2, s2, l2] = colorData2 ?? [0, 0.5, 0.5];

  let color = `hsla(${h * 360},${s * 100}%,${l * 100}%,0.5)`;
  let color2 = `hsla(${h2 * 360},${s2 * 100}%,${l2 * 100}%,0.5)`;
  const [play] = useSound("/media/disconnect.wav", {
    playbackRate: 0.2 + i / 15,
    volume: 0.15,
  });

  let background = `linear-gradient(45deg, ${color}, ${color2})`;
  return (
    <button
      className={classNames("simulation-button", { selected, shrink })}
      onClick={() => {
        if (!setSelected) return;
        play();
        const bg = document.querySelector(".blocklyMainBackground");
        if (bg) bg.style.fill = background.replace("0.5", "0.3");
        setSelected(i);
      }}
      style={{ pointerEvents: inert && "none", background }}
    >
      {elements[i]}
    </button>
  );
};

const ElementButtons = ({
  selectedElement,
  setSelected,
  colors,
  color2s,
  elements,
  disabled,
  inert = false,
  appMode = "mapmaker",
}) => {
  let enabledElements = elements.filter((_, i) => !disabled[i]);
  let [hovering, setHovering] = useState(null);
  const [play] = useSound("/media/disconnect.wav", { volume: 0.25 });

  if (appMode === "game") {
    // Game mode: two labeled rows — Ships and Trails
    const shipRow = SHIP_TYPES.filter((i) => !disabled[i]);
    const trailRow = TRAIL_TYPES.filter((i) => !disabled[i]);

    const handleSelect = (i) => {
      if (inert) return;
      play();
      const bg = document.querySelector(".blocklyMainBackground");
      if (bg) {
        const c = colors[i] ?? [0, 0.5, 0.5];
        bg.style.fill = `hsla(${c[0] * 360},${c[1] * 100}%,${c[2] * 100}%,0.3)`;
      }
      setSelected(i);
      if (SHIP_TYPES.includes(i)) useStore.getState().setActiveShipType(i);
      if (TRAIL_TYPES.includes(i)) useStore.getState().setActiveTrailType(i);
    };

    return (
      <div className="element-tray">
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, opacity: 0.6, minWidth: 32 }}>Ships</span>
          {shipRow.map((i) => (
            <ElementButton
              key={i} i={i} elements={elements} colors={colors} color2s={color2s}
              setSelected={handleSelect} selected={i === selectedElement} inert={inert}
            />
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
          <span style={{ fontSize: 10, opacity: 0.6, minWidth: 32 }}>Trails</span>
          {trailRow.map((i) => (
            <ElementButton
              key={i} i={i} elements={elements} colors={colors} color2s={color2s}
              setSelected={handleSelect} selected={i === selectedElement} inert={inert}
            />
          ))}
        </div>
        {!inert && <div className="spacer" />}
      </div>
    );
  }

  // Mapmaker mode: terrain (0-6, 9-10) + all creatures (11+), hide game-only elements
  return (
    <div className="element-tray">
      {elements.map((e, i) => {
        if (disabled[i]) return null;
        if (MAPMAKER_HIDDEN.has(i)) return null;
        return (
          <ElementButton
            elements={elements} colors={colors} color2s={color2s}
            key={i} i={i}
            setSelected={setSelected}
            selected={i === selectedElement}
            inert={inert}
            shrink={hovering === "-" && i === selectedElement}
          />
        );
      })}
      {inert === false && (
        <span onMouseLeave={() => setHovering(null)}>
          <button
            onMouseEnter={() => setHovering("-")}
            className="simulation-button element-control"
            onClick={() => {
              play();
              useStore.getState().deleteSelectedElement();
            }}
          >
            -
          </button>
          {enabledElements.length < MAX_ELEMENTS && (
            <button
              onMouseEnter={() => setHovering("+")}
              className="simulation-button element-control"
              onClick={() => {
                play();
                useStore.getState().newElement();
              }}
            >
              +
            </button>
          )}
        </span>
      )}
      {!inert && <div className="spacer" />}
    </div>
  );
};

export const WrappedElementButtons = ({ selectedElement, setSelected }) => {
  const elements = useStore((state) => state.elements);
  const disabled = useStore((state) => state.disabled);
  const colors = useStore((state) => state.colors);
  const color2s = useStore((state) => state.color2s);
  const appMode = useStore((state) => state.appMode);

  return (
    <ElementButtons
      elements={elements}
      disabled={disabled}
      colors={colors}
      color2s={color2s}
      selectedElement={selectedElement}
      setSelected={setSelected}
      appMode={appMode}
    />
  );
};
export default ElementButtons;
