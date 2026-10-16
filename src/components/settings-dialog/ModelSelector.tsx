/**
 * Model selector dropdown component for switching between Gemini 3.8 Live
 * models and language presets in the settings dialog.
 */

import { useCallback, useEffect, useState } from "react";
import Select from "react-select";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { modelOptions, ModelOption } from "../../models";
import { AppConfig } from "../../types";

/**
 * Renders the model and language preset selector and updates the Live API
 * context configuration when a new option is chosen.
 */
export default function ModelSelector() {
  const { model, setModel, config, setConfig, restart, connected } =
    useLiveAPIContext();

  const [selectedOption, setSelectedOption] = useState<ModelOption | null>(
    () => {
      return (
        modelOptions.find((opt) => opt.id === config.defaultModelId) ||
        modelOptions[0]
      );
    }
  );

  useEffect(() => {
    const lang = config.speechConfig?.languageCode;
    const currentOption =
      modelOptions.find(
        (opt) =>
          opt.modelName === model &&
          opt.config.speechConfig?.languageCode === lang
      ) || modelOptions.find((opt) => opt.modelName === model);
    if (currentOption) {
      setSelectedOption(currentOption);
    }
  }, [model, config.speechConfig?.languageCode]);

  useEffect(() => {
    if (connected) {
      restart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, config.speechConfig?.languageCode]);

  const updateModel = useCallback(
    (option: ModelOption) => {
      console.info(
        `[ModelSelector] Switching Live API model preset to ${option.id} (${option.modelName})`
      );
      setModel(option.modelName);
      const newConfig: AppConfig = {
        ...config,
        ...option.config,
        speechConfig: {
          ...config.speechConfig,
          ...option.config.speechConfig,
        },
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
