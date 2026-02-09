import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";

// Formata número inteiro para o padrão brasileiro (sem decimais)
export const formatNumber = (value) => {
  if (value === "" || value === null || value === undefined) return "";
  
  const numValue = typeof value === "string" ? parseInt(value.replace(/\./g, "")) : value;
  
  if (isNaN(numValue)) return "";
  
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numValue);
};

// Converte string formatada para número inteiro
export const parseNumber = (formattedValue) => {
  if (!formattedValue || formattedValue === "") return 0;
  
  const cleaned = formattedValue.replace(/\./g, "");
  const parsed = parseInt(cleaned);
  
  return isNaN(parsed) ? 0 : parsed;
};

export const NumberInput = React.forwardRef(({ value, onChange, disabled, placeholder, className, ...props }, ref) => {
  const [displayValue, setDisplayValue] = useState("");

  useEffect(() => {
    if (value === 0 || value === "0" || value === "") {
      setDisplayValue("");
    } else if (value) {
      setDisplayValue(formatNumber(value));
    }
  }, [value]);

  const handleChange = (e) => {
    const input = e.target.value;
    
    // Remove tudo exceto números
    const cleaned = input.replace(/\D/g, "");
    
    setDisplayValue(cleaned);
    
    // Converte e envia o valor numérico
    const numericValue = parseNumber(cleaned);
    
    if (onChange) {
      onChange({ target: { value: numericValue } });
    }
  };

  const handleBlur = () => {
    // Ao sair do campo, formata completamente
    if (displayValue && displayValue !== "") {
      const numericValue = parseNumber(displayValue);
      if (numericValue !== 0) {
        setDisplayValue(formatNumber(numericValue));
      }
    }
  };

  return (
    <Input
      ref={ref}
      type="text"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      disabled={disabled}
      placeholder={placeholder}
      className={className}
      {...props}
    />
  );
});

NumberInput.displayName = "NumberInput";