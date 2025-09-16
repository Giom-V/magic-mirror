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
    id: "proactive",
    value: "proactive",
    label: "Gemini 2.5 Flash (Proactive Audio)",
    modelName: "gemini-2.5-flash-preview-native-audio-dialog",
    config: {
      proactivity: { proactiveAudio: true },
      speechConfig: {},
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
