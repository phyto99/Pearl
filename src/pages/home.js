import React, { useState } from "react";

export default function Home() {
  return (
    <>
      <div className="post splash">
        <p>
          <b>Welcome to Sandspiel Studio! 🧪</b>
        </p>
        <p>
          A tool for creating {"&"} sharing Sandspiel
          elements, made by Max Bittker and Lu Wilson. 
 
          Check out our{" "}
          <a href="https://www.youtube.com/watch?v=48-9jjndb2k">
            YouTube channel
          </a>{" "}
          for tutorials and updates!
        </p>
        <p>
          Please be respectful and kind towards other users.
        </p>
      </div>
    </>
  );
}
