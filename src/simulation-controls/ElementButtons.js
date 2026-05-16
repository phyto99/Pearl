import React, { useState } from "react";
import classNames from "classnames";
import { MAX_ELEMENTS, useStore } from "../store";
import useSound from "use-sound";

// Element indices matching starterblocks.js order
const ELEM_SHIP = 9;
const ELEM_TRAIL = 10;

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

  let background = `linear-gradient(45deg,
    ${color},
    ${color2}
    )`;
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
      style={{
        pointerEvents: inert && "none",
        background,
      }}
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

  return (
    <div className="element-tray">
      {elements.map((e, i) => {
        if (disabled[i]) return null;

        // Mapmaker: hide ship and trail
        if (appMode === "mapmaker" && (i === ELEM_SHIP || i === ELEM_TRAIL)) return null;

        // Game mode: only show ship
        if (appMode === "game" && i !== ELEM_SHIP) return null;

        return (
          <ElementButton
            elements={elements}
            colors={colors}
            color2s={color2s}
            key={i}
            i={i}
            setSelected={setSelected}
            selected={i === selectedElement}
            inert={inert}
            shrink={hovering === "-" && i === selectedElement}
          />
        );
      })}
      {inert === false && appMode === "mapmaker" && (
        <span onMouseLeave={() => setHovering(null)}>
          <button
            onMouseEnter={() => setHovering("-")}
            className={"simulation-button element-control"}
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
              className={"simulation-button element-control "}
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
      {!inert && <div className={"spacer"} />}
      <style jsx>{``}</style>
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
