/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useRef, useState, useEffect, useCallback } from "react";
import "./App.scss";
import { useWebcam } from "./hooks/use-webcam";
import { LiveAPIProvider, useLiveAPIContext } from "./contexts/LiveAPIContext";
import SidePanel from "./components/side-panel/SidePanel";
import { Altair } from "./components/altair/Altair";
import ControlTray from "./components/control-tray/ControlTray";
import MagicEffect from "./components/magic-effect/MagicEffect";
import cn from "classnames";
import { LiveClientOptions } from "./types";
import { GoogleGenAI, Part } from "@google/genai";
import { disguiseCameraImage } from "./tools/disguiseCameraImage";
import { toggleMusic } from "./tools/music-tool";
import config from "./config.json";

const API_KEY = process.env.REACT_APP_GEMINI_API_KEY as string;
if (typeof API_KEY !== "string") {
  throw new Error("set REACT_APP_GEMINI_API_KEY in .env");
}

const apiOptions: LiveClientOptions = {
  apiKey: API_KEY,
  httpOptions: { apiVersion: "v1alpha" },
};

function App() {
  // this video reference is used for displaying the active stream, whether that is the webcam or screen capture
  // feel free to style as you see fit
  const videoRef = useRef<HTMLVideoElement>(null);
  // either the screen capture, the video or null, if null we hide it
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const webcam = useWebcam();

  const { connected, connect, disconnect } = useLiveAPIContext();


  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const showAndHide = () => {
      setControlsVisible(true);
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setControlsVisible(false);
      }, 3000);
    };

    if (!connected) {
      setControlsVisible(true);
      return;
    }

    setControlsVisible(false);

    window.addEventListener("mousemove", showAndHide);

    return () => {
      window.removeEventListener("mousemove", showAndHide);
      clearTimeout(timeoutId);
    };
  }, [connected]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        if (connected) {
          disconnect();
        } else {
          connect();
        }
      } else if (event.key === " ") {
        if (!connected) {
          connect();
          setMuted(false);
        } else {
          setMuted(!muted);
        }
      } else if (event.key === "d") {
        setSidePanelOpen(!sidePanelOpen);
      } else if (event.key === "i") {
        disguiseCameraImage("a fantasy character", webcam, setEditedImage);
      } else if (event.key === "m") {
        toggleMusic();
      } else if (event.key === "Delete") {
        setEditedImage(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [connected, connect, disconnect, setMuted, webcam, setEditedImage]);

  return (
    <div className="App">
      <div className="streaming-console">
        <SidePanel
          editedImage={editedImage}
          setEditedImage={setEditedImage}
          open={sidePanelOpen}
          onToggle={() => setSidePanelOpen(!sidePanelOpen)}
        />
        <main>
          <div className="main-app-area">
            {/* APP goes here */}
            {editedImage && <MagicEffect imageUrl={editedImage} />}
            <Altair />
            <video
              className={cn("stream", {
                hidden: !videoRef.current || !videoStream,
              })}
              ref={videoRef}
              autoPlay
              playsInline
            />
          </div>

          <div className={cn("control-tray-container", { visible: controlsVisible })}>
            <ControlTray
              videoRef={videoRef}
              supportsVideo={true}
              onVideoStreamChange={setVideoStream}
              enableEditingSettings={true}
              muted={muted}
              onMuteChange={setMuted}
            >
              {/* put your own buttons here */}
            </ControlTray>
          </div>
        </main>
      </div>
    </div>
  );
}

function AppWrapper() {
  return (
    <LiveAPIProvider options={apiOptions}>
      <App />
    </LiveAPIProvider>
  );
}

export default AppWrapper;
