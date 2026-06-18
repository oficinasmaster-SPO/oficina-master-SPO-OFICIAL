import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const formatBRL = (val) => {
  const num = Number(val);
  if (isNaN(num) || val === "" || val === null || val === undefined) return "";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
};

const InputMoeda = React.forwardRef(({ className, value, onChange, onBlur, placeholder = "R$ 0,00", disabled, required, ...props }, ref) => {
  const [displayValue, setDisplayValue] = useState(formatBRL(value));
  const lastNumericRef = useRef(Number(value) || 0);

  // Sincroniza display quando o valor externo muda (ex: inicialização)
  useEffect(() => {
    const num = Number(value) || 0;
    if (num !== lastNumericRef.current) {
      lastNumericRef.current = num;
      setDisplayValue(formatBRL(num));
    }
  }, [value]);

  const handleChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) {
      setDisplayValue("");
      lastNumericRef.current = 0;
      if (onChange) onChange(0);
      return;
    }
    const num = Number(raw) / 100;
    lastNumericRef.current = num;
    setDisplayValue(
      new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num)
    );
    if (onChange) onChange(num);
  };

  const handleBlur = (e) => {
    // Reformata ao sair do campo
    setDisplayValue(formatBRL(lastNumericRef.current));
    if (onBlur) onBlur(e);
  };

  return (
    <input
      type="text"
      ref={ref}
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
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