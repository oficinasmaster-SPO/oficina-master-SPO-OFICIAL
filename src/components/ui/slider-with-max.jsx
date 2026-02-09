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
  // Garantir que value é sempre um número
  const numericValue = typeof value === 'number' ? value : (typeof value === 'string' ? parseInt(String(value).replace(/\D/g, '')) : 0) || min;
  
  const [isOver100, setIsOver100] = React.useState(numericValue > max);
  const [inputValue, setInputValue] = React.useState(numericValue > max ? numericValue : max);

  React.useEffect(() => {
    const val = typeof value === 'number' ? value : (typeof value === 'string' ? parseInt(String(value).replace(/\D/g, '')) : 0) || min;
    if (val > max) {
      setIsOver100(true);
      setInputValue(val);
    } else {
      setIsOver100(false);
    }
  }, [value, max, min]);

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
            value={[numericValue > max ? max : numericValue]}
            onValueChange={handleSliderChange}
            min={min}
            max={max}
            step={1}
            disabled={disabled}
            className="w-full"
          />
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>{min}{suffix}</span>
            <span className="font-semibold text-blue-600">{numericValue}{suffix}</span>
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