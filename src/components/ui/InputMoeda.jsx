import React, { useState, useEffect } from "react";

export function InputMoeda({ value, onChange, placeholder = "R$ 0,00", className = "", disabled, required }) {
  const formatValue = (val) => {
    if (val === null || val === undefined || val === "") return "";
    const numberValue = Number(val);
    if (isNaN(numberValue)) return "";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(numberValue);
  };

  const [displayValue, setDisplayValue] = useState(formatValue(value));

  useEffect(() => {
    // Only update if the external value differs significantly to avoid cursor jumping
    const formatted = formatValue(value);
    if (formatted !== displayValue && value !== 0) {
        setDisplayValue(formatted);
    }
  }, [value]);

  const handleChange = (e) => {
    let rawValue = e.target.value.replace(/\D/g, ""); // remove tudo que não é número
    
    if (!rawValue) {
      setDisplayValue("");
      if (onChange) onChange({ target: { value: 0 } });
      return;
    }

    let numberValue = Number(rawValue) / 100;

    setDisplayValue(
      new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(numberValue)
    );

    if (onChange) {
      onChange({ target: { value: numberValue } });
    }
  };

  return (
    <input
      type="text"
      value={displayValue}
      onChange={handleChange}
      placeholder={placeholder}
      className={`flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      disabled={disabled}
      required={required}
    />
  );
}