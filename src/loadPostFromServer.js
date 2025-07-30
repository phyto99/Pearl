import { decode } from "fast-png";
import starterXMLs from "./blocks/starterblocks";
import { globalState, MAX_ELEMENTS, useStore } from "./store";
import { width, height, sands, randomData } from "./simulation/SandApi";
import { worldScaleMap } from "./simulation-controls/WorldSizeButtons.js";
import * as Sentry from "@sentry/nextjs";
import BlocklyJS from "blockly/javascript";
import { Xml } from "blockly/core";
import { generateCode } from "./blocks/generator.js";
import { useRef, useState } from "react";
import { getRandomColorName } from "./utils/theme.js";

const imageURLBase =
  "https://storage.googleapis.com/sandspiel-studio/creations/";

export async function loadPostFromServer(postId, retrys = 0) {
  let id = postId;
  const idNumber = parseInt(id, 10);

  // Only load the starter elements if no post is getting loaded
  if (isNaN(idNumber) || id.length < 1) {
    useStore.getState().setXmls(starterXMLs);
    useStore.setState({ expandedPostId: null });

    const disabled = [];
    for (let i = 0; i < 4; i++) {
      disabled[i] = false;
    }

    for (let i = 4; i < MAX_ELEMENTS; i++) {
      disabled[i] = true;
    }
    useStore.setState({ disabled });
    loadIntoEditor();
    return;
  }

  const startTime = Date.now();
  const { loading } = useStore.getState();
  if (!loading) {
    useStore.setState({ curtainColor: "purple" /*getRandomColorName() */ });
  }
  useStore.setState({ loading: true });
  useStore.setState({ expandedPostId: idNumber });
  // Skip database loading - just use default values
  console.log("Skipping database load for id:", id);
  
  const worldScale = 1 / 2;
  const worldWidth = Math.round(worldScale * width);
  const worldHeight = Math.round(worldScale * width);

  // Store world dimensions in two places for performance reasons
  useStore.getState().setWorldSize([worldWidth, worldHeight]);
  globalState.worldWidth = worldWidth;
  globalState.worldHeight = worldHeight;

  useStore.getState().setWorldScale(worldScale);
  useStore.setState({
    initialWorldSize: worldWidth,
    initialWorldScale: worldScale,
  });

  useStore.setState({ paused: true });
  useStore.setState({ initialPaused: false });

  useStore.getState().setXmls(starterXMLs);

  const disabled = [];
  for (let i = 0; i < 4; i++) {
    disabled[i] = false;
  }
  for (let i = 4; i < MAX_ELEMENTS; i++) {
    disabled[i] = true;
  }

  useStore.setState({
    initialSelected: 0,
    disabled,
    post: null,
    size: 3,
  });

  globalState.wraparoundEnabled = true;

  if (useStore.getState().expandedPostId !== idNumber) {
    return "cancel";
  }

  useStore.setState({ postId: id });
  
  // Initialize with empty sand data
  for (let i = 0; i < width * height * 4; i += 4) {
    sands[i] = 0;
    sands[i + 1] = randomData(i / 4 % width, Math.floor(i / 4 / width));
    sands[i + 2] = 0;
    sands[i + 3] = 0;
  }

  const nowTime = Date.now();
  const elapsedTime = nowTime - startTime;
  if (elapsedTime < 500) {
    await new Promise((r) => setTimeout(r, 500 - elapsedTime));
  }

  useStore.setState({ initialSandsData: null });

  await loadIntoEditor(idNumber);
  useStore.setState({ loading: false });
}

const loadIntoEditor = async (idNumber = null) => {
  let ws = globalState.workspace;
  BlocklyJS.init(ws);

  const { setSelected } = useStore.getState();
  for (let i = useStore.getState().elements.length - 1; i >= 0; i--) {
    setSelected(i);

    ws.clear();

    await new Promise((resolve) => {
      if (useStore.getState().expandedPostId !== idNumber) {
        return "cancel";
      }
      let cb = () => {
        generateCode(i, ws);
        ws.removeChangeListener(cb);
        resolve();
      };
      ws.addChangeListener(cb);
      let xml = useStore.getState().xmls[i];
      let dom = Xml.textToDom(xml);
      try {
        Xml.domToWorkspace(dom, ws);
      } catch (e) {
        console.error(e);
      }
    });
  }
  setSelected(useStore.getState().initialSelected);
  useStore.setState({ paused: useStore.getState().initialPaused });
};
