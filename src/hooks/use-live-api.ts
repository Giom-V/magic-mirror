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
  Modality,
  MediaResolution,
  StartSensitivity,
  EndSensitivity,
} from "@google/genai";
import { AppConfig } from "../types";
import { stopMusic } from "../tools/music-tool";

export type UseLiveAPIResults = {
  client: GenAILiveClient;
  setConfig: (config: AppConfig) => void;
  config: AppConfig;
  model: string;
  setModel: (model: string) => void;
  connected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  restart: () => Promise<void>;
  volume: number;
  isInputFocused: boolean;
  setInputFocused: (isInputFocused: boolean) => void;
};

export function useLiveAPI(options: LiveClientOptions): UseLiveAPIResults {
  const client = useMemo(() => new GenAILiveClient(options), [options]);
  const audioStreamerRef = useRef<AudioStreamer | null>(null);

  const [model, setModel] = useState<string>(appConfig.liveModel);
  const [config, setConfig] = useState<AppConfig>(() => {
    const functionDeclarations = Object.values(appConfig.tools).map(
      (tool: any) => {
        const declaration = {
          name: tool.name,
          description: tool.description,
          behavior: "NON_BLOCKING",
        } as unknown as FunctionDeclaration;

        if (tool.parameters) {
          declaration.parameters = tool.parameters;
        }

        return declaration;
      }
    );

    return {
      ...appConfig,
      responseModalities: [Modality.AUDIO],
      mediaResolution: MediaResolution.MEDIA_RESOLUTION_MEDIUM,
      realtimeInputConfig: {
        automaticActivityDetection: {
          disabled: false,
          startOfSpeechSensitivity: StartSensitivity.START_SENSITIVITY_LOW,
          endOfSpeechSensitivity: EndSensitivity.END_SENSITIVITY_LOW,
          prefixPaddingMs: 20,
          silenceDurationMs: 100,
        },
      },
      contextWindowCompression: {
        triggerTokens: "25600",
        slidingWindow: { targetTokens: "12800" },
      },
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: "Aoede",
          },
        },
      },
      tools: [
        { googleSearch: {} },
        {
          functionDeclarations,
        },
      ],
    };
  });
  const [connected, setConnected] = useState(false);
  const [volume, setVolume] = useState(0);
  const [isInputFocused, setInputFocused] = useState(false);
  const configRef = useRef(config);
  configRef.current = config;

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
    const appConfig = configRef.current;
    if (!appConfig) {
      throw new Error("config has not been set");
    }

    const languageCode = appConfig.speechConfig?.languageCode || "en-US";
    const systemInstructionText =
      appConfig.systemInstructions?.[languageCode] ||
      appConfig.systemInstructions?.["en-US"] ||
      "";

    const liveConnectConfig = {
      responseModalities: appConfig.responseModalities,
      mediaResolution: appConfig.mediaResolution,
      realtimeInputConfig: appConfig.realtimeInputConfig,
      contextWindowCompression: appConfig.contextWindowCompression,
      tools: appConfig.tools,
      speechConfig: {
        ...appConfig.speechConfig,
        languageCode: languageCode,
      },
      systemInstruction: {
        parts: [{ text: systemInstructionText }],
      },
    };

    console.log(
      "Connecting to GenAI Live with config:",
      JSON.stringify(liveConnectConfig, null, 2)
    );
    client.disconnect();
    await client.connect(model, liveConnectConfig);
  }, [client, model]);

  const disconnect = useCallback(async () => {
    client.disconnect();
    stopMusic();
    setConnected(false);
  }, [setConnected, client]);

  const restart = useCallback(async () => {
    await disconnect();
    await connect();
  }, [disconnect, connect]);

  return useMemo(
    () => ({
      client,
      config,
      setConfig,
      model,
      setModel,
      connected,
      connect,
      disconnect,
      restart,
      volume,
      isInputFocused,
      setInputFocused,
    }),
    [
      client,
      config,
      setConfig,
      model,
      setModel,
      connected,
      connect,
      disconnect,
      restart,
      volume,
      isInputFocused,
      setInputFocused,
    ]
  );
}
