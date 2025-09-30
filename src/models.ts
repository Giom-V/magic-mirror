import { AppConfig } from "./types";

export type ModelOption = {
  id: string;
  value: string;
  label: string;
  modelName: string;
  config: Partial<AppConfig>;
};

const proactiveModelConfig = {
  modelName: "gemini-2.5-flash-native-audio-preview-09-2025",
  config: {
    proactivity: { proactiveAudio: true },
  },
};

export const modelOptions: ModelOption[] = [
  {
    id: "proactive-french",
    value: "proactive-french",
    label: "2.5 proactive French",
    ...proactiveModelConfig,
    config: {
      ...proactiveModelConfig.config,
      speechConfig: {
        languageCode: "fr-FR",
      },
    },
  },
  {
    id: "proactive-english",
    value: "proactive-english",
    label: "2.5 proactive English",
    ...proactiveModelConfig,
    config: {
      ...proactiveModelConfig.config,
      speechConfig: {
        languageCode: "en-US",
      },
    },
  },
  {
    id: "french",
    value: "french",
    label: "2.5 flash French",
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
    label: "2.5 flash English",
    modelName: "gemini-2.5-flash-live-preview",
    config: {
      proactivity: { proactiveAudio: false },
      speechConfig: {
        languageCode: "en-US",
      },
    },
  },
];