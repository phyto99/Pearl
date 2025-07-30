import React, { useState } from "react";

export default function Home() {
  return (
    <>
      <div className="post splash">
        <p>
          <b>Welcome to Sandspiel Studio! 🧪</b>
        </p>
        <p>
          <strong>Running in Local Mode</strong> - Database features are disabled.
          You can still create and experiment with Sandspiel elements using the editor!
        </p>
        <p>
          A tool for creating &amp; sharing Sandspiel
          elements, made by Max Bittker and Lu Wilson. 
 
          Check out our{" "}
          <a href="https://www.youtube.com/watch?v=48-9jjndb2k">
            YouTube channel
          </a>{" "}
          for tutorials and updates!
        </p>
        <p>
          <strong>Click &ldquo;← Open Editor&rdquo; above to start creating!</strong>
        </p>
      </div>
    </>
  );
}
