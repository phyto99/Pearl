import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useQueryParams, withDefault, BooleanParam } from "next-query-params";
import { useRouter } from "next/router";

import {
  seed,
  reset,
  width,
  height,
  sands,
  tick,
  popUndo,
  addBorder,
} from "../simulation/SandApi";
import { useStore } from "../store";
import * as vkbeautify from "vkbeautify";
import PlayPause from "./PlayPauseButton";
import SizeButtons from "./SizeButtons";
import WorldSizeButtons from "./WorldSizeButtons";
import Home from "../Auth";
import UploadButtons from "./UploadButtons";
export const imageURLBase =
  "https://storage.googleapis.com/sandspiel-studio/creations/";

function prepareXMLs() {
  let regex = /id="([^\\]*?)"/g;
  let minifiedXmls = useStore
    .getState()
    .xmls.map((x) => vkbeautify.xmlmin(x).replaceAll(regex, ""));
  return minifiedXmls;
}

function prepareExport() {
  let minifiedXmls = prepareXMLs();
  let json = JSON.stringify(minifiedXmls, null, " ");
  return json;
}

const ExtraUI = () => {
  const router = useRouter();
  const [query, setQuery] = useQueryParams({
    edit: withDefault(BooleanParam, false),
    admin: withDefault(BooleanParam, true),
  });
  const playMode = !query.edit;

  const appMode = useStore((state) => state.appMode);
  const setAppMode = useStore((state) => state.setAppMode);
  const gameStarted = useStore((state) => state.gameStarted);
  const setGameStarted = useStore((state) => state.setGameStarted);
  const setPaused = useStore((state) => state.setPaused);

  let [copiedState, setCopiedState] = useState(null);
  const post = useStore((state) => state.post);
  const paused = useStore((state) => state.paused);
  const pos = useStore((state) => state.pos);
  const elements = useStore((state) => state.elements);
  let index = (pos[0] + pos[1] * width) * 4;
  let t = sands[index];
  let g = sands[index + 1];
  let b = sands[index + 2];
  let a = sands[index + 3];

  let mobile = false;
  if (window.innerWidth <= 700) {
    mobile = true;
  }

  function exportToClipboard() {
    let json = prepareExport();
    var data = [
      new ClipboardItem({
        "text/plain": new Blob([json], { type: "text/plain" }),
      }),
    ];
    navigator.clipboard
      .write(data)
      .then(
        () => setCopiedState(" ✓"),
        () => setCopiedState("...Error")
      )
      .finally(() => {
        window.setTimeout(() => setCopiedState(null), 3000);
      });
  }

  function switchToGameMode() {
    setAppMode("game");
    setGameStarted(false);
    setPaused(true);
    // Auto-select ship element
    useStore.getState().setSelected(9);
  }

  function switchToMapmaker() {
    setAppMode("mapmaker");
    setGameStarted(false);
    setPaused(false);
  }

  function startGame() {
    setGameStarted(true);
    setPaused(false);
  }

  if (appMode === "game") {
    return (
      <div className="extras-tray">
        <div className="controls-row">
          <span>
            {!gameStarted ? (
              <>
                <button
                  className="simulation-button"
                  style={{ fontWeight: "bold", background: "rgba(0,180,80,0.3)" }}
                  onClick={startGame}
                >
                  ▶ Play
                </button>
                <button
                  className="simulation-button"
                  onClick={switchToMapmaker}
                >
                  ← Mapmaker
                </button>
              </>
            ) : (
              <>
                <PlayPause />
                <button
                  className="simulation-button"
                  onClick={() => {
                    setGameStarted(false);
                    setPaused(true);
                  }}
                >
                  ↺ Reset Game
                </button>
                <button
                  className="simulation-button"
                  onClick={switchToMapmaker}
                >
                  ← Mapmaker
                </button>
              </>
            )}
          </span>
        </div>
        <img className="wordmark" src="/sandspiel.png"></img>
      </div>
    );
  }

  // Mapmaker mode
  return (
    <div className="extras-tray">
      <div className="controls-row">
        <span>
          <PlayPause />
          <button
            className="simulation-button"
            onClick={() => {
              popUndo();
            }}
          >
            Undo
          </button>

          <button
            className="simulation-button"
            onClick={() => {
              seed();
              addBorder();
            }}
          >
            Clear
          </button>
          {paused && (
            <button
              className="simulation-button"
              onClick={() => {
                tick();
              }}
            >
              Step
            </button>
          )}
        </span>
        <SizeButtons />
      </div>

      <div className="controls-row">
        <span>
          <label style={{ fontSize: '12px', marginRight: '8px' }}>Tick Speed:</label>
          <input
            type="range"
            min="0.1"
            max="3"
            step="0.1"
            value={useStore.getState().tickSpeed || 1}
            onChange={(e) => {
              const speed = parseFloat(e.target.value);
              useStore.setState({ tickSpeed: speed });
            }}
            style={{ width: '100px', marginRight: '8px' }}
          />
          <span style={{ fontSize: '12px', minWidth: '30px' }}>{(useStore.getState().tickSpeed || 1).toFixed(1)}x</span>
        </span>
      </div>

      <div className="controls-row">
        {!mobile && (
          <pre style={{ width: 120, height: "1em" }}>
            {t !== undefined &&
              `${elements[t]}\n${g} Color Fade\n${b} Hue Rotate\n${a} Extra`}
          </pre>
        )}
        <WorldSizeButtons />
      </div>

      <div className="controls-row">
        <button
          className="simulation-button"
          style={{ fontWeight: "bold", background: "rgba(0,100,255,0.2)" }}
          onClick={exportToClipboard}
        >
          Export Map {copiedState}
        </button>
        <button
          className="simulation-button"
          style={{ fontWeight: "bold", background: "rgba(0,180,80,0.2)" }}
          onClick={switchToGameMode}
        >
          ▶ Game Mode
        </button>
      </div>

      <img className="wordmark" src="/sandspiel.png"></img>
    </div>
  );
};
export default ExtraUI;
