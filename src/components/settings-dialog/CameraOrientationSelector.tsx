import { useCallback, useState } from "react";
import Select from "react-select";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";

const orientationOptions = [
  { value: "horizontal", label: "Horizontal" },
  { value: "vertical", label: "Vertical" },
];

export default function CameraOrientationSelector() {
  const { config, setConfig } = useLiveAPIContext();

  const [selectedOption, setSelectedOption] = useState<{
    value: string;
    label: string;
  } | null>(
    orientationOptions.find(
      (o) => o.value === (config.camera?.orientation || "horizontal")
    ) || orientationOptions[0]
  );

  const updateConfig = useCallback(
    (orientation: "horizontal" | "vertical") => {
      setConfig({
        ...config,
        camera: {
          orientation,
        },
      });
    },
    [config, setConfig]
  );

  return (
    <div className="select-group">
      <label htmlFor="camera-orientation-selector">Camera Orientation</label>
      <Select
        id="camera-orientation-selector"
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
        defaultValue={selectedOption}
        options={orientationOptions}
        onChange={(e) => {
          setSelectedOption(e);
          if (e && (e.value === "horizontal" || e.value === "vertical")) {
            updateConfig(e.value);
          }
        }}
      />
    </div>
  );
}
