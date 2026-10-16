/**
 * Live API model configuration options for the Magic Mirror application.
 *
 * Defines selectable Gemini 3.8 Live and Gemini 3.8 Live Extended Thinking
 * configurations across French and English locales.
 */

import { ThinkingLevel } from "@google/genai";
import { AppConfig } from "./types";

export type ModelOption = {
  id: string;
  value: string;
  label: string;
  modelName: string;
  config: Partial<AppConfig>;
};

export const modelOptions: ModelOption[] = [
  {
    id: "proactive-french",
    value: "proactive-french",
    label: "3.8 Live French",
    modelName: "gemini-3.8-live",
    config: {
      thinkingConfig: undefined,
      speechConfig: {
        languageCode: "fr-FR",
      },
    },
  },
  {
    id: "proactive-english",
    value: "proactive-english",
    label: "3.8 Live English",
    modelName: "gemini-3.8-live",
    config: {
      thinkingConfig: undefined,
      speechConfig: {
        languageCode: "en-US",
      },
    },
  },
  {
    id: "thinking-french",
    value: "thinking-french",
    label: "3.8 Live Thinking French",
    modelName: "gemini-3.8-live-extended-thinking",
    config: {
      thinkingConfig: {
        thinkingLevel: ThinkingLevel.LOW,
      },
      speechConfig: {
        languageCode: "fr-FR",
      },
    },
  },
  {
    id: "thinking-english",
    value: "thinking-english",
    label: "3.8 Live Thinking English",
    modelName: "gemini-3.8-live-extended-thinking",
    config: {
      thinkingConfig: {
        thinkingLevel: ThinkingLevel.LOW,
      },
      speechConfig: {
        languageCode: "en-US",
      },
    },
  },
];
