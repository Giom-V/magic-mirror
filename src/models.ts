import { AppConfig } from "./types";

export const modelOptions: { id: string; config: Partial<AppConfig> }[] = [
  {
    id: "french",
    config: {
      speechConfig: {
        languageCode: "fr-FR",
      },
    },
  },
  {
    id: "english",
    config: {
      speechConfig: {
        languageCode: "en-US",
      },
    },
  },
];
