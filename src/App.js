import React, { useRef, useState, useEffect } from "react";
import { Xml } from "blockly/core";
import BlocklyJS from "blockly/javascript";
import starterXMLs from "./blocks/starterblocks";
import Sand from "./simulation/Sand.js";
import useStore, { globalState } from "./store";
import BlocklyComponent from "./Blockly";
import "./blocks/customblocks";
import "./blocks/generator";
import { ToolboxBlocks } from "./blocks/ToolboxBlocks";
import { generateCode } from "./blocks/generator";

// if (typeof window !== "undefined") {
//   if (!window?.location?.host?.includes("localhost")) {
//     Sentry.init({
//       dsn: "https://b2a3ffe2014947f5bb7c35db0eded196@o40136.ingest.sentry.io/6405403",
//       integrations: [new BrowserTracing()],
//       tracesSampleRate: 0.1,
//     });
//   }
// }

const App = () => {
  const playMode = false; // Always show editor
  let simpleWorkspace = useRef();
  const selectedElement = useStore((state) => state.selectedElement);
  const xmls = useStore.getState().xmls;

  useEffect(() => {
    if (simpleWorkspace.current) {
      let ws = simpleWorkspace.current.primaryWorkspace;
      globalState.workspace = ws;
    }
  }, []);

  // Generate code when a post is loaded into the editor
  /*useEffect(async () => {
    setFetchedData(false);
    if (postId === undefined) {
      setFetchedData(true);
      return;
    }
    await loadPostFromServer(postId);
    setFetchedData(true);
  }, [postId]);*/

  // Generate code when we start the editor
  /*useEffect(async () => {
    if (!fetchedData || !simpleWorkspace.current) {
      return;
    }
    let ws = simpleWorkspace.current.primaryWorkspace;
    globalState.workspace = ws;
    BlocklyJS.init(ws);

    for (let i = useStore.getState().elements.length - 1; i >= 0; i--) {
      setSelected(i);

      ws.clear();

      await new Promise((resolve) => {
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
    setLoaded(true);
    useStore.setState({ paused: useStore.getState().initialPaused });
  }, [simpleWorkspace, fetchedData]);*/

  // Generate code whenever you change something in the editor
  useEffect(() => {
    if (simpleWorkspace.current) {
      let ws = simpleWorkspace.current.primaryWorkspace;
      globalState.workspace = ws;
      let cb = () => generateCode(selectedElement, ws);
      ws.addChangeListener(cb);
      return () => {
        ws.removeChangeListener(cb);
      };
    }
  }, [simpleWorkspace, selectedElement, xmls]);

  // When you change the selected element, show that element's code in the editor
  useEffect(() => {
    if (!simpleWorkspace.current) return;
    simpleWorkspace.current.primaryWorkspace.clear();
    const xml =
      useStore.getState().xmls[useStore.getState().selectedElement ?? 0];
    if (!xml) return;
    Xml.domToWorkspace(
      Xml.textToDom(xml),
      simpleWorkspace.current.primaryWorkspace
    );
  }, [selectedElement]);

  const loading = useStore((state) => state.loading);
  let filter = loading ? `brightness(1.0) contrast(0.1) saturate(0.1)` : "";
  return (
    <div className="App">
      <BlocklyComponent
        style={{
          filter,
          opacity: "1.0",
          transition: "transform 0.5s ease-in-out, opacity 0.5s ease-in-out",
        }}
        ref={simpleWorkspace}
        collapse={false}
        comments={false}
        disable={false}
        maxBlocks={Infinity}
        readOnly={false}
        trashcan={false}
        media={"/media/"}
        renderer={"custom_renderer"}
        move={{
          scrollbars: true,
          drag: true,
          wheel: true,
        }}
        zoom={{
          controls: true,
        }}
        initialXml={starterXMLs[1]}
      >
        <ToolboxBlocks />
      </BlocklyComponent>
      <Sand playMode={playMode} />
    </div>
  );
};
export default App;
