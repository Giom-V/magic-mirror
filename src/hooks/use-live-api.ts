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
  Type,
  Modality,
  MediaResolution,
  StartSensitivity,
  EndSensitivity,
  LiveServerToolCall,
} from "@google/genai";
import { playMusic, stopMusic } from "../tools/music-tool";
import { AppConfig } from "../types";

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

    const onSetupComplete = () => {
      if (config.introductoryMessage) {
        const lang = navigator.language;
        const message = lang.startsWith("fr")
          ? config.introductoryMessage["fr-FR"]
          : config.introductoryMessage["en-US"];

        if (message) {
          client.send({ text: message });
        }
      }
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

    const onToolCall = (toolCall: LiveServerToolCall) => {
      if (toolCall.functionCalls) {
        for (const fnCall of toolCall.functionCalls) {
          switch (fnCall.name) {
            case "play_music":
              console.log("Handling play_music tool call", fnCall.args);
              if (fnCall.args && typeof fnCall.args.prompt === "string") {
                playMusic(fnCall.args.prompt, fnCall.args.modelName as string | undefined);
              }
              break;
            case "stop_music":
              console.log("Handling stop_music tool call");
              stopMusic();
              break;
          }
        }
      }
    };

    client
      .on("error", onError)
      .on("open", onOpen)
      .on("close", onClose)
      .on("setupcomplete", onSetupComplete)
      .on("interrupted", stopAudioStreamer)
      .on("audio", onAudio)
      .on("toolcall", onToolCall);

    return () => {
      client
        .off("error", onError)
        .off("open", onOpen)
        .off("close", onClose)
        .off("setupcomplete", onSetupComplete)
        .off("interrupted", stopAudioStreamer)
        .off("audio", onAudio)
        .off("toolcall", onToolCall)
        .disconnect();
    };
  }, [client, config]);

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
