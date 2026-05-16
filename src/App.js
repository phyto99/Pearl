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

const App = () => {
  let simpleWorkspace = useRef();
  const selectedElement = useStore((state) => state.selectedElement);
  const xmls = useStore.getState().xmls;
  const appMode = useStore((state) => state.appMode);

  useEffect(() => {
    if (simpleWorkspace.current) {
      let ws = simpleWorkspace.current.primaryWorkspace;
      globalState.workspace = ws;
    }
  }, []);

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
      {appMode === "mapmaker" ? (
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
      ) : (
        <div className="game-panel-left" />
      )}
      <Sand />
    </div>
  );
};
export default App;
