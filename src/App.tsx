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

  function fileToGenerativePart(data: string, mimeType: string): Part {
    return {
      inlineData: {
        data,
        mimeType,
      },
    };
  }

  const editCameraImage = useCallback(async () => {
    console.log("Using tool: edit_camera_image");
    const stream = await webcam.start();
    const video = document.createElement("video");
    video.srcObject = stream;
    video.autoplay = true;
    video.play();

    video.addEventListener("loadeddata", async () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg");
      const base64Data = dataUrl.split(",")[1];

      const ai = new GoogleGenAI({
        apiKey: process.env.REACT_APP_GEMINI_API_KEY as string,
      });
      const imagePart = fileToGenerativePart(base64Data, "image/jpeg");

      const response = await ai.models.generateContent({
        model: config.imageEditModel,
        contents: [imagePart, config.tools.editCameraImage.prompt],
      });

      if (
        response.candidates &&
        response.candidates.length > 0 &&
        response.candidates[0].content &&
        response.candidates[0].content.parts
      ) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData && part.inlineData.data) {
            const base64ImageBytes: string = part.inlineData.data;
            const imageUrl = `data:image/png;base64,${base64ImageBytes}`;
            setEditedImage(imageUrl);
          }
        }
      }
      webcam.stop();
    });
  }, [webcam, setEditedImage]);

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
        }
        setMuted(false);
      } else if (event.key === "i") {
        editCameraImage();
      } else if (event.key === "Delete") {
        setEditedImage(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [connected, connect, disconnect, setMuted, editCameraImage, setEditedImage]);

  return (
    <div className="App">
      <div className="streaming-console">
        <SidePanel editedImage={editedImage} setEditedImage={setEditedImage} />
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
