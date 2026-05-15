import React from "react";
import "./AIAvatar.css";

export default function AIAvatar({ isSpeaking }) {
  return (
    <div className={`avatar-container ${isSpeaking ? "speaking" : ""}`}>

      {/* FACE */}
      <div className="face">

        {/* eyes */}
        <div className="eyes">
          <div className="eye" />
          <div className="eye" />
        </div>

        {/* mouth (lip sync simulation) */}
        <div className={`mouth ${isSpeaking ? "talking" : ""}`} />

      </div>

    </div>
  );
}