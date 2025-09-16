import { useCallback, useEffect, useState } from "react";
import Select from "react-select";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { AppConfig } from "../../types";

type ModelOption = {
  id: string;
  value: string;
  label: string;
  modelName: string;
  config: Partial<AppConfig>;
};

const modelOptions: ModelOption[] = [
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

export default function ModelSelector() {
  const { model, setModel, config, setConfig, restart } = useLiveAPIContext();

  const [selectedOption, setSelectedOption] = useState<ModelOption | null>(
    () => {
      return (
        modelOptions.find((opt) => opt.id === config.defaultModelId) ||
        modelOptions[0]
      );
    }
  );

  useEffect(() => {
    const currentOption = modelOptions.find((opt) => opt.modelName === model);
    if (currentOption) {
      setSelectedOption(currentOption);
    }
  }, [model]);

  useEffect(() => {
    if (selectedOption) {
      updateModel(selectedOption, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateModel = useCallback(
    (option: ModelOption, restartOnUpdate: boolean) => {
      setModel(option.modelName);
      const newConfig: AppConfig = {
        ...config,
        ...option.config,
        speechConfig: {
          ...config.speechConfig,
          ...option.config.speechConfig,
        },
        systemInstruction:
          config.systemInstructions?.[
            option.config.speechConfig?.languageCode || "en-US"
          ] || "",
      };
      setConfig(newConfig);

      if (restartOnUpdate) {
        restart();
      }
    },
    [config, setConfig, setModel, restart]
  );

  return (
    <div className="select-group">
      <label htmlFor="model-selector">Model</label>
      <Select
        id="model-selector"
        className="react-select"
        classNamePrefix="react-select"
        styles={{
          control: (baseStyles) => ({
            ...baseStyles,
            background: "var(--Neutral-15)",
            color: "var(--Neutral-90)",
            minHeight: "33px",
            maxHeight: "33px",
            border: 0,
          }),
          option: (styles, { isFocused, isSelected }) => ({
            ...styles,
            backgroundColor: isFocused
              ? "var(--Neutral-30)"
              : isSelected
              ? "var(--Neutral-20)"
              : undefined,
          }),
        }}
        value={selectedOption}
        defaultValue={selectedOption}
        options={modelOptions}
        onChange={(e) => {
          if (e) {
            setSelectedOption(e);
            updateModel(e, true);
          }
        }}
      />
    </div>
  );
}
