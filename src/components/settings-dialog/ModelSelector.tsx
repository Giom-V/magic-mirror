import { useCallback, useEffect, useState } from "react";
import Select from "react-select";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { AppConfig } from "../../types";

type ModelOption = {
  value: string;
  label: string;
  config: Partial<AppConfig>;
};

const modelOptions: ModelOption[] = [
  {
    value: "gemini-2.5-flash-preview-native-audio-dialog",
    label: "Gemini 2.5 Flash (Proactive Audio)",
    config: {
      proactivity: { proactiveAudio: true },
      speechConfig: {},
    },
  },
  {
    value: "gemini-2.5-flash-live-preview-fr",
    label: "Gemini 2.5 Flash (French)",
    config: {
      proactivity: { proactiveAudio: false },
      speechConfig: {
        languageCode: "fr-FR",
      },
    },
  },
  {
    value: "gemini-2.5-flash-live-preview-en",
    label: "Gemini 2.5 Flash (English)",
    config: {
      proactivity: { proactiveAudio: false },
      speechConfig: {
        languageCode: "en-US",
      },
    },
  },
];

export default function ModelSelector() {
  const { model, setModel, config, setConfig } = useLiveAPIContext();

  const [selectedOption, setSelectedOption] = useState<ModelOption | null>(
    () => {
      return modelOptions.find((opt) => opt.value === model) || modelOptions[0];
    }
  );

  useEffect(() => {
    const currentOption = modelOptions.find((opt) => opt.value === model);
    if (currentOption) {
      setSelectedOption(currentOption);
    }
  }, [model]);

  useEffect(() => {
    if (selectedOption) {
      updateModel(selectedOption);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateModel = useCallback(
    (option: ModelOption) => {
      setModel(option.value);
      const newConfig: AppConfig = {
        ...config,
        ...option.config,
        speechConfig: {
          ...config.speechConfig,
          ...option.config.speechConfig,
        },
        systemInstruction:
          config.systemInstructions?.[
            option.config.speechConfig?.languageCode || "fr-FR"
          ] || "",
      };
      setConfig(newConfig);
    },
    [config, setConfig, setModel]
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
            updateModel(e);
          }
        }}
      />
    </div>
  );
}
