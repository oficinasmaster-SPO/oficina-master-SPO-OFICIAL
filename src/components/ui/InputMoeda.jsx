import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const InputMoeda = React.forwardRef(({ className, value, onChange, placeholder = "R$ 0,00", disabled, required, ...props }, ref) => {
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
    // Atualiza apenas se o valor externo for diferente, para evitar que o cursor pule
    const formatted = formatValue(value);
    if (formatted !== displayValue && value !== 0) {
      setDisplayValue(formatted);
    }
  }, [value]);

  const handleChange = (e) => {
    let rawValue = e.target.value.replace(/\D/g, ""); // Remove tudo que não for número

    if (!rawValue) {
      setDisplayValue("");
      if (onChange) {
        // Envia valor 0 e simula a mesma estrutura de um evento comum (e.target.value)
        onChange({ ...e, target: { ...e.target, value: 0 } });
      }
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
      onChange({ ...e, target: { ...e.target, value: numberValue } });
    }
  };

  return (
    <input
      type="text"
      ref={ref}
      value={displayValue}
      onChange={handleChange}
      placeholder={placeholder}
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      disabled={disabled}
      required={required}
      {...props}
    />
  );
});

InputMoeda.displayName = "InputMoeda";

export { InputMoeda };