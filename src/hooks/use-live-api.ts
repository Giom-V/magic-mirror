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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import appConfig from "../config.json";
import { GenAILiveClient } from "../lib/genai-live-client";
import { LiveClientOptions } from "../types";
import { AudioStreamer } from "../lib/audio-streamer";
import { audioContext } from "../lib/utils";
import VolMeterWorket from "../lib/worklets/vol-meter";
import {
  FunctionDeclaration,
  FunctionDeclarationsTool,
  HarmBlockThreshold,
  HarmCategory,
  Part,
  Tool as GoogleTool,
} from "@google/generative-ai";
import { Content, GenerateContentRequest } from "@google/generative-ai/server";

const {
  VITE_API_PROXY_URL,
  VITE_GEMINI_API_KEY,
  VITE_GEMINI_MODEL_NAME: GEMINI_MODEL_NAME,
} = import.meta.env;

export type UseLiveAPIResults = {
  client: GenAILiveClient;
  setConfig: (config: LiveConnectConfig) => void;
  config: LiveConnectConfig;
  model: string;
  setModel: (model: string) => void;
  connected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  volume: number;
  isMuted: boolean;
  isListening: boolean;
  isThinking: boolean;
  isSpeaking: boolean;
  toggleMute: () => void;
  start: () => void;
  stop: () => void;
  send: (message: string) => void;
  generateContent: (parts: Part[]) => Promise<string>;
  editImage: (character: string) => Promise<void>;
  clearImage: () => void;
};

type LiveConnectConfig = Omit<StartChatParams, "history"> & {
  responseMimeType: "text/plain" | "audio/mp3";
};

export function useLiveAPI(options: LiveCientOptions): UseLiveAIResults {
  const client = useMemo(() => new GenAILiveClient(options), [options]);
  const audioStreamerRef = useRef<AudioStreamer | null>(null);

  const [model, setModel] = useState<string>(appConfig.liveModel);
  const [config, setConfig] = useState<LiveConnectConfig>(() => {
    const editCameraImage: FunctionDeclaration = {
      name: appConfig.tools.editCameraImage.name,
      description: appConfig.tools.editCameraImage.description,
      parameters: {
        type: "OBJECT",
        properties: {
          character: {
            type: "STRING",
            description:
              "The fairy tale or fantasy character to transform the person into. For example: 'ogre', 'elf', 'witch', 'king', etc.",
          },
        },
        required: ["character"],
      },
    };

    const clearImage: FunctionDeclaration = {
      name: appConfig.tools.clearImage.name,
      description: appConfig.tools.clearImage.description,
      parameters: {
        type: "OBJECT",
        properties: {},
        required: [],
      },
    };

    const renderAltair: FunctionDeclaration = {
      name: appConfig.tools.renderAltair.name,
      description: appConfig.tools.renderAltair.description,
      parameters: {
        type: "OBJECT",
        properties: {
          json_graph: {
            type: "STRING",
            description:
              appConfig.tools.renderAltair.parameters.properties.json_graph
                .description,
          },
        },
        required: appConfig.tools.renderAltair.parameters.required,
      },
    };

    return {
      responseMimeType: "audio/mp3",
      sampleRateHertz: 16000,
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
      ],
      generationConfig: {
        temperature: 0.9,
        topP: 0.95,
        topK: 64,
        maxOutputTokens: 8192,
      },
      systemInstruction: {
        parts: [{ text: appConfig.systemInstruction }],
      },
      tools: [
        {
          functionDeclarations: [editCameraImage, clearImage, renderAltair],
        },
      ],
    };
  });
  const [connected, setConnected] = useState(false);
  const [volume, setVolume] = useState(0);

  // register audio for streaming server -> speakers
  useEffect(() => {
    if (!audioStreamerRef.current) {
      audioContext({ id: "audio-out" }).then((audioCtx: AudioContext) => {
        audioStreamerRef.current = new AudioStreamer(audioCtx);
        audioStreamerRef.current
          .addWorklet<any>("vumeter-out", VolMeterWorket, (ev: any) => {
            setVolume(ev.data.volume);
          })
          .then(() => {
            // Successfully added worklet
          });
      });
    }
  }, [audioStreamerRef]);

  useEffect(() => {
    const onOpen = () => {
      setConnected(true);
    };

    const onClose = () => {
      setConnected(false);
    };

    const onError = (error: ErrorEvent) => {
      console.error("error", error);
    };

    const stopAudioStreamer = () => audioStreamerRef.current?.stop();

    const onAudio = (data: ArrayBuffer) =>
      audioStreamerRef.current?.addPCM16(new Uint8Array(data));

    client
      .on("error", onError)
      .on("open", onOpen)
      .on("close", onClose)
      .on("interrupted", stopAudioStreamer)
      .on("audio", onAudio);

    return () => {
      client
        .off("error", onError)
        .off("open", onOpen)
        .off("close", onClose)
        .off("interrupted", stopAudioStreamer)
        .off("audio", onAudio)
        .disconnect();
    };
  }, [client]);

  const connect = useCallback(async () => {
    if (!config) {
      throw new Error("config has not been set");
    }
    console.log("Connecting with config:", config);
    client.disconnect();
    await client.connect(model, config);
  }, [client, config, model]);

  const disconnect = useCallback(async () => {
    client.disconnect();
    setConnected(false);
  }, [setConnected, client]);

  return {
    client,
    config,
    setConfig,
    model,
    setModel,
    connected,
    connect,
    disconnect,
    volume,
  };
}
