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

import { createContext, FC, ReactNode, useContext } from "react";
import { useLiveAPI, UseLiveAPIResults } from "../hooks/use-live-api";
import { GenAILiveClient } from "../lib/genai-live-client";
import { LiveClientOptions } from "../types";

const LiveAPIContext = createContext<UseLiveAPIResults | undefined>(undefined);

export type LiveAPIProviderProps = {
  children: ReactNode;
  options: LiveClientOptions;
};

const noOp = () => {};
const noOpPromise = () => Promise.resolve();

const mockClient = {
  on: noOp,
  off: noOp,
  emit: noOp,
  connect: noOpPromise,
  disconnect: () => true,
  send: noOp,
  sendRealtimeInput: noOp,
  sendToolResponse: noOp,
  status: "disconnected" as const,
  session: null,
  model: null,
  getConfig: () => ({}),
};

const mockLiveAPIResults: UseLiveAPIResults = {
  client: mockClient as unknown as GenAILiveClient,
  setConfig: noOp,
  config: {},
  model: "",
  setModel: noOp,
  connected: false,
  connect: noOpPromise,
  disconnect: noOpPromise,
  volume: 0,
};

// This component contains the hook and should only be rendered when we have an API key.
const LiveAPIProviderWithHook: FC<LiveAPIProviderProps> = ({
  options,
  children,
}) => {
  const liveAPI = useLiveAPI(options);
  return (
    <LiveAPIContext.Provider value={liveAPI}>
      {children}
    </LiveAPIContext.Provider>
  );
};

// This is the main exported provider. It decides whether to use the real or mock provider.
export const LiveAPIProvider: FC<LiveAPIProviderProps> = ({
  options,
  children,
}) => {
  if (options.apiKey) {
    return (
      <LiveAPIProviderWithHook options={options}>
        {children}
      </LiveAPIProviderWithHook>
    );
  }

  // If no API key, provide the mock context value.
  return (
    <LiveAPIContext.Provider value={mockLiveAPIResults}>
      {children}
    </LiveAPIContext.Provider>
  );
};

export const useLiveAPIContext = () => {
  const context = useContext(LiveAPIContext);
  if (!context) {
    throw new Error("useLiveAPIContext must be used wihin a LiveAPIProvider");
  }
  return context;
};
