import starterXMLs from "./blocks/starterblocks";
import { globalState, MAX_ELEMENTS, useStore } from "./store";
import { width, height, sands, randomData } from "./simulation/SandApi";
import BlocklyJS from "blockly/javascript";
import { Xml } from "blockly/core";
import { generateCode } from "./blocks/generator.js";
import { getRandomColorName } from "./utils/theme.js";

export async function loadPostFromServer(postId) {
  const id = String(postId);

  // No ID → reset to starter elements
  if (!id || id.length < 1) {
    useStore.getState().setXmls(starterXMLs);
    useStore.setState({ expandedPostId: null });
    const disabled = starterXMLs.map((_, i) => i >= 9);
    useStore.setState({ disabled });
    loadIntoEditor();
    return;
  }

  useStore.setState({ loading: true, curtainColor: getRandomColorName(), expandedPostId: id });

  // Fetch map data from local API
  const res = await fetch(`/api/maps/${id}`);
  if (!res.ok) {
    console.error('Map not found:', id);
    useStore.setState({ loading: false });
    return;
  }
  const mapData = await res.json();

  const { worldWidth, worldHeight, sandsBase64, disabled } = mapData;
  const mW = worldWidth  || 75;
  const mH = worldHeight || 75;

  // Set world dimensions
  useStore.getState().setWorldSize([mW, mH]);
  useStore.getState().setWorldScale(mW / width);
  globalState.worldWidth  = mW;
  globalState.worldHeight = mH;
  useStore.setState({ initialWorldSize: mW, initialWorldScale: mW / width });

  // Clear sands buffer
  for (let i = 0; i < width * height * 4; i++) sands[i] = 0;

  // Decode and write sand data (compact mW×mH → 300-wide sands buffer)
  if (sandsBase64) {
    const raw = Uint8Array.from(atob(sandsBase64), (c) => c.charCodeAt(0));
    for (let y = 0; y < mH; y++) {
      for (let x = 0; x < mW; x++) {
        const src = (x + y * mW) * 4;
        const dst = (x + y * width) * 4;  // width = 300 (full buffer stride)
        sands[dst + 0] = raw[src + 0]; // element
        sands[dst + 1] = raw[src + 1] || randomData(x, y); // RA
        sands[dst + 2] = raw[src + 2]; // RB
        sands[dst + 3] = raw[src + 3]; // RC
      }
    }
  }

  // Set elements — always use full starterXMLs (map uses indices 0-18)
  useStore.getState().setXmls(starterXMLs.slice(0, MAX_ELEMENTS));
  useStore.setState({
    disabled: disabled || new Array(MAX_ELEMENTS).fill(false),
    initialSelected: 9, // Water selected by default after loading a map
    paused: false,
    initialPaused: false,
    size: 2,
  });
  globalState.wraparoundEnabled = false;

  // Short delay so curtain is visible
  await new Promise((r) => setTimeout(r, 300));

  loadIntoEditor(id);
  useStore.setState({ loading: false });
}

const loadIntoEditor = (id = null) => {
  const ws = globalState.workspace;
  if (!ws) return;
  BlocklyJS.init(ws);

  const { setSelected } = useStore.getState();
  const xmls = useStore.getState().xmls;

  for (let i = xmls.length - 1; i >= 0; i--) {
    if (useStore.getState().expandedPostId !== id) break;
    setSelected(i);
    ws.clear();
    try {
      Xml.domToWorkspace(Xml.textToDom(xmls[i]), ws);
    } catch (e) {
      console.error('loadIntoEditor xml error element', i, e);
    }
    generateCode(i, ws);
  }

  setSelected(useStore.getState().initialSelected);
  useStore.setState({ paused: useStore.getState().initialPaused });
};
