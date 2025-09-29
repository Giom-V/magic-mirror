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
    label: "Gemini 2.5 Flash (Proactive, French)",
    modelName: "gemini-2.5-flash-native-audio-preview-09-2025",
    config: {
      proactivity: { proactiveAudio: true },
      speechConfig: {
        languageCode: "fr-FR",
      },
    },
  },
  {
    id: "proactive-english",
    value: "proactive-english",
    label: "Gemini 2.5 Flash (Proactive, English)",
    modelName: "gemini-2.5-flash-native-audio-preview-09-2025",
    config: {
      proactivity: { proactiveAudio: true },
      speechConfig: {
        languageCode: "en-US",
      },
    },
  },
  {
    id: "french",
    value: "french",
    label: "Gemini 2.5 Flash (French)",
    modelName: "gemini-2.5-flash-live-preview",
    config: {
      proactivity: { proactiveAudio: false },
      speechConfig: {
        languageCode: "fr-FR",
      },
    },
  },
  {
    id: "english",
    value: "english",
    label: "Gemini 2.5 Flash (English)",
    modelName: "gemini-2.5-flash-live-preview",
    config: {
      proactivity: { proactiveAudio: false },
      speechConfig: {
        languageCode: "en-US",
      },
    },
  },
];