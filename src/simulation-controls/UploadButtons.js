import React, { useState } from "react";

const UploadButtons = () => {
  const [title, setTitle] = useState("");

  return (
    <>
      <input
        type="text"
        placeholder="Local mode - saving disabled"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled
      />
      <button
        className="simulation-button postButton"
        disabled
        title="Database features disabled in local mode"
      >
        Save (Disabled)
      </button>
      <br></br>
      <span style={{ color: '#666', fontSize: '12px' }}>
        Upload and sharing features are disabled in local mode
      </span>
    </>
  );
};
export default UploadButtons;
