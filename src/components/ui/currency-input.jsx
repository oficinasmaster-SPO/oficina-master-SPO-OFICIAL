import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";

// Formata número para o padrão brasileiro
export const formatCurrency = (value) => {
  if (value === "" || value === null || value === undefined) return "";
  
  const numValue = typeof value === "string" ? parseFloat(value.replace(/\./g, "").replace(",", ".")) : value;
  
  if (isNaN(numValue)) return "";
  
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numValue);
};

// Converte string formatada para número
export const parseCurrency = (formattedValue) => {
  if (!formattedValue || formattedValue === "") return 0;
  
  const cleaned = formattedValue.replace(/\./g, "").replace(",", ".");
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? 0 : parsed;
};

export const CurrencyInput = React.forwardRef(({ value, onChange, disabled, placeholder, className, ...props }, ref) => {
  const [displayValue, setDisplayValue] = useState("");

  useEffect(() => {
    if (value === 0 || value === "0" || value === "") {
      setDisplayValue("");
    } else if (value) {
      setDisplayValue(formatCurrency(value));
    }
  }, [value]);

  const handleChange = (e) => {
    const input = e.target.value;
    
    // Remove tudo exceto números e vírgula
    const cleaned = input.replace(/[^\d,]/g, "");
    
    // Previne múltiplas vírgulas
    const parts = cleaned.split(",");
    let formatted = parts[0];
    if (parts.length > 1) {
      formatted += "," + parts[1].slice(0, 2); // Máximo 2 casas decimais
    }
    
    setDisplayValue(formatted);
    
    // Converte e envia o valor numérico
    const numericValue = parseCurrency(formatted);
    
    if (onChange) {
      onChange({ target: { value: numericValue } });
    }
  };

  const handleBlur = () => {
    // Ao sair do campo, formata completamente
    if (displayValue && displayValue !== "") {
      const numericValue = parseCurrency(displayValue);
      if (numericValue !== 0) {
        setDisplayValue(formatCurrency(numericValue));
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

CurrencyInput.displayName = "CurrencyInput";