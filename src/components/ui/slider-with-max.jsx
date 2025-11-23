import React from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SliderWithMax({ 
  value, 
  onChange, 
  disabled = false,
  label,
  suffix = "",
  min = 1,
  max = 100
}) {
  const [isOver100, setIsOver100] = React.useState(value > max);
  const [inputValue, setInputValue] = React.useState(value > max ? value : max);

  React.useEffect(() => {
    if (value > max) {
      setIsOver100(true);
      setInputValue(value);
    } else {
      setIsOver100(false);
    }
  }, [value, max]);

  const handleSliderChange = (newValue) => {
    const val = newValue[0];
    if (val === max) {
      setIsOver100(true);
      setInputValue(max);
      onChange(max);
    } else {
      setIsOver100(false);
      onChange(val);
    }
  };

  const handleInputChange = (e) => {
    const val = parseInt(e.target.value) || max;
    setInputValue(val);
    onChange(val);
  };

  return (
    <div className="space-y-3">
      {label && <Label>{label}</Label>}
      
      {!isOver100 ? (
        <>
          <Slider
            value={[value > max ? max : value]}
            onValueChange={handleSliderChange}
            min={min}
            max={max}
            step={1}
            disabled={disabled}
            className="w-full"
          />
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>{min}{suffix}</span>
            <span className="font-semibold text-blue-600">{value}{suffix}</span>
            <span>{max}+{suffix}</span>
          </div>
        </>
      ) : (
        <div className="space-y-2">
          <Input
            type="number"
            min={max}
            value={inputValue}
            onChange={handleInputChange}
            disabled={disabled}
            placeholder={`Acima de ${max}${suffix}`}
          />
          <button
            type="button"
            onClick={() => {
              setIsOver100(false);
              onChange(max);
            }}
            disabled={disabled}
            className="text-sm text-blue-600 hover:underline disabled:opacity-50"
          >
            ← Voltar para seleção até {max}{suffix}
          </button>
        </div>
      )}
    </div>
  );
}