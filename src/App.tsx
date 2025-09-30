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

import { useRef, useState, useEffect } from "react";
import "./App.scss";
import { useWebcam } from "./hooks/use-webcam";
import { LiveAPIProvider, useLiveAPIContext } from "./contexts/LiveAPIContext";
import SidePanel from "./components/side-panel/SidePanel";
import ControlTray from "./components/control-tray/ControlTray";
import MagicEffect from "./components/magic-effect/MagicEffect";
import cn from "classnames";
import { LiveClientOptions } from "./types";
import {
  Chat,
  FunctionResponse,
  FunctionResponseScheduling,
  GoogleGenAI,
  LiveServerToolCall,
} from "@google/genai";
import { disguiseCameraImage } from "./tools/disguiseCameraImage";
import { editImage } from "./tools/editImage";
import { generateStoryImage } from "./tools/generateStoryImage";
import { playMusic, stopMusic, toggleMusic } from "./tools/music-tool";
import appConfig from "./config.json";

const API_KEY = process.env.REACT_APP_GEMINI_API_KEY as string;

const apiOptions: LiveClientOptions = {
  apiKey: API_KEY,
  httpOptions: { apiVersion: "v1alpha" },
};

function App() {
  // this video reference is used for displaying the active stream, whether that is the webcam or screen capture
  // feel free to style as you see fit
  const videoRef = useRef<HTMLVideoElement>(null);
  const standingVideoRef = useRef<HTMLVideoElement>(null);
  // either the screen capture, the video or null, if null we hide it
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [showVideo, setShowVideo] = useState(true);
  const [showCamera, setShowCamera] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [activeTalkingVideo, setActiveTalkingVideo] = useState(0);
  const endOfSpeechTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [disguisedImage, setDisguisedImage] = useState<string | null>(null);
  const [storyImage, setStoryImage] = useState<string | null>(null);
  const [lastEditedImage, setLastEditedImage] = useState<string | null>(null);
  const [imageChat, setImageChat] = useState<Chat | null>(null);
  const [storyChat, setStoryChat] = useState<Chat | null>(null);
  const [aiClient, setAiClient] = useState<GoogleGenAI | null>(null);
  const [muted, setMuted] = useState(false);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [didAutoConnect, setDidAutoConnect] = useState(false);
  const webcam = useWebcam();
  const prevConnected = useRef(false);

  const {
    client,
    connected,
    setupComplete,
    connect,
    disconnect,
    config,
    isInputFocused,
    volume,
  } = useLiveAPIContext();

  useEffect(() => {
    if (API_KEY) {
      setAiClient(new GoogleGenAI({ apiKey: API_KEY }));
    }
  }, []);

  // Centralized tool call handler
  useEffect(() => {
    const onToolCall = async (toolCall: LiveServerToolCall) => {
      if (!toolCall.functionCalls) {
        return;
      }
      console.log("App.tsx: Received tool call:", toolCall.functionCalls);

      const functionResponses: FunctionResponse[] = [];

      for (const fnCall of toolCall.functionCalls) {
        let result: any = { result: "ok" };
        // Default to WHEN_IDLE, override for image tools
        let scheduling = FunctionResponseScheduling.WHEN_IDLE;

        try {
          switch (fnCall.name) {
            case appConfig.tools.disguise_camera_image.name:
              console.log(
                "App.tsx: Handling disguise_camera_image tool call",
                fnCall.args
              );
              if (!aiClient) {
                throw new Error("AI client not initialized.");
              }
              const imageUrl = await disguiseCameraImage(
                fnCall.args?.disguise_character as string,
                webcam,
                config,
                aiClient,
                setImageChat
              );
              setDisguisedImage(imageUrl);
              setLastEditedImage(imageUrl);
              // Interrupt to show the image immediately
              scheduling = FunctionResponseScheduling.INTERRUPT;
              break;

            case appConfig.tools.edit_image.name:
              console.log(
                "App.tsx: Handling edit_image tool call",
                fnCall.args
              );
              if (!imageChat) {
                throw new Error("No image chat available.");
              }
              const editedImageUrl = await editImage(
                fnCall.args?.prompt as string,
                imageChat,
                config
              );
              setLastEditedImage(editedImageUrl);
              // Interrupt to show the image immediately
              scheduling = FunctionResponseScheduling.INTERRUPT;
              break;

            case appConfig.tools.clearImage.name:
              console.log("App.tsx: Handling clearImage tool call");
              setDisguisedImage(null);
              setStoryImage(null);
              setLastEditedImage(null);
              setImageChat(null);
              setStoryChat(null);
              break;

            case appConfig.tools.generate_story_image.name:
              console.log(
                "App.tsx: Handling generate_story_image tool call",
                fnCall.args
              );
              if (!aiClient) {
                throw new Error("AI client not initialized.");
              }
              const prompt = fnCall.args?.prompt;
              if (typeof prompt !== 'string' || !prompt) {
                throw new Error(
                  "The 'prompt' argument is missing or invalid for generate_story_image tool call."
                );
              }
              const storyImageUrl = await generateStoryImage(
                prompt,
                aiClient,
                config,
                storyChat,
                setStoryChat
              );
              setStoryImage(storyImageUrl);
              setLastEditedImage(storyImageUrl);
              scheduling = FunctionResponseScheduling.SILENT;
              break;

            case "play_music":
              console.log("App.tsx: Handling play_music tool call", fnCall.args);
              if (fnCall.args && typeof fnCall.args.prompt === "string") {
                playMusic(
                  fnCall.args.prompt,
                  config,
                  fnCall.args.modelName as string | undefined
                );
              }
              scheduling = FunctionResponseScheduling.SILENT;
              break;

            case "stop_music":
              console.log("App.tsx: Handling stop_music tool call");
              stopMusic();
              break;

            default:
              console.warn(`Unknown tool call: ${fnCall.name}`);
              result = { result: "error", error: "Unknown tool" };
              break;
          }
        } catch (e: any) {
          console.error(`Error executing tool ${fnCall.name}:`, e);
          result = { result: "error", error: e.message || "Unknown error" };
        }

        functionResponses.push({
          id: fnCall.id,
          name: fnCall.name,
          response: {
            ...result,
            scheduling,
          },
        });
      }

      if (functionResponses.length > 0) {
        console.log("App.tsx: Sending tool responses:", functionResponses);
        client.sendToolResponse({ functionResponses });
      }
    };

    client.on("toolcall", onToolCall);
    return () => {
      client.off("toolcall", onToolCall);
    };
  }, [client, webcam, config, lastEditedImage, aiClient, imageChat]);

  useEffect(() => {
    if (volume > 0.1) {
      if (endOfSpeechTimerRef.current) {
        clearTimeout(endOfSpeechTimerRef.current);
        endOfSpeechTimerRef.current = null;
      }
      if (!isTalking) {
        setIsTalking(true);
      }
    } else if (isTalking) {
      if (endOfSpeechTimerRef.current === null) {
        endOfSpeechTimerRef.current = setTimeout(() => {
          setIsTalking(false);
          endOfSpeechTimerRef.current = null;
        }, (config as any).endOfSpeechGracePeriodMs || 2000);
      }
    }
  }, [volume, isTalking, config]);

  useEffect(() => {
    if (isTalking) {
      setActiveTalkingVideo(Math.floor(Math.random() * 4));
    }
  }, [isTalking]);

  useEffect(() => {
    if (
      config.autoStart &&
      config.autoStart.enabled &&
      !connected &&
      !didAutoConnect
    ) {
      setDidAutoConnect(true);
      connect();
    }

    if (connected && !prevConnected.current) {
      if (config.autoStart?.withCamera) {
        webcam.start().then(setVideoStream);
      }
    }

    prevConnected.current = connected;
  }, [
    connect,
    webcam,
    setVideoStream,
    connected,
    didAutoConnect,
    config,
    prevConnected,
  ]);

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
      if (isInputFocused) return;
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
        if (!aiClient) {
          console.error("AI client not initialized.");
          return;
        }
        // Kept for manual testing/debugging
        disguiseCameraImage(
          "a fantasy character",
          webcam,
          config,
          aiClient,
          setImageChat
        ).then((image) => {
          setDisguisedImage(image);
          setLastEditedImage(image);
        });
      } else if (event.key === "m") {
        toggleMusic(config);
      } else if (event.key.toLowerCase() === "c") {
        console.log("Clearing images");
        setDisguisedImage(null);
        setLastEditedImage(null);
        setShowVideo(true);
      } else if (event.key === "Delete") {
        console.log("Clearing images");
        setDisguisedImage(null);
        setLastEditedImage(null);
        setShowVideo(true);
      } else if (event.key.toLowerCase() === "v") {
        setShowCamera(!showCamera);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    connected,
    connect,
    disconnect,
    muted,
    setMuted,
    webcam,
    config,
    setShowVideo,
    isInputFocused,
    showVideo,
    sidePanelOpen,
    showCamera,
    setShowCamera,
  ]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = videoStream;
    }
  }, [videoStream]);

  useEffect(() => {
    if (!videoStream || !connected || !setupComplete) {
      return;
    }

    const video = videoRef.current;
    if (!video) {
      return;
    }

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      console.error("Could not get 2d context from canvas");
      return;
    }

    const frameSender = setInterval(() => {
      if (video.readyState >= 2) {
        // HAVE_CURRENT_DATA
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        const base64Data = dataUrl.split(",")[1];

        if (base64Data) {
          client.sendRealtimeInput([
            { mimeType: "image/jpeg", data: base64Data },
          ]);
        }
      }
    }, 500); // Send frame every 500ms

    return () => {
      clearInterval(frameSender);
    };
  }, [videoStream, connected, setupComplete, client, videoRef]);

  return (
    <div className="App">
      <div className="streaming-console">
        <SidePanel
          open={sidePanelOpen}
          onToggle={() => setSidePanelOpen(!sidePanelOpen)}
        />
        <main>
          <div className="main-app-area">
            <video
              ref={standingVideoRef}
              src="standing.mp4"
              className={cn("face", { hidden: !showVideo || isTalking })}
              autoPlay
              loop
              muted
            />
            <video
              src="talking1.mp4"
              className={cn("face", {
                hidden: !showVideo || !isTalking || activeTalkingVideo !== 0,
              })}
              autoPlay
              muted
              onEnded={() => setActiveTalkingVideo(Math.floor(Math.random() * 4))}
            />
            <video
              src="talking2.mp4"
              className={cn("face", {
                hidden: !showVideo || !isTalking || activeTalkingVideo !== 1,
              })}
              autoPlay
              muted
              onEnded={() => setActiveTalkingVideo(Math.floor(Math.random() * 4))}
            />
            <video
              src="talking3.mp4"
              className={cn("face", {
                hidden: !showVideo || !isTalking || activeTalkingVideo !== 2,
              })}
              autoPlay
              muted
              onEnded={() => setActiveTalkingVideo(Math.floor(Math.random() * 4))}
            />
            <video
              src="talking4.mp4"
              className={cn("face", {
                hidden: !showVideo || !isTalking || activeTalkingVideo !== 3,
              })}
              autoPlay
              muted
              onEnded={() => setActiveTalkingVideo(Math.floor(Math.random() * 4))}
            />
            {/* APP goes here */}
            {(() => {
              const imageUrl = lastEditedImage || storyImage || disguisedImage;
              if (imageUrl) {
                return <MagicEffect imageUrl={imageUrl} />;
              }
              return null;
            })()}
            <video
              className={cn("stream", {
                hidden: !showCamera || !videoRef.current || !videoStream,
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
