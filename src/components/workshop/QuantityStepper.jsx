import React from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function QuantityStepper({ value = 1, min = 1, onChange, className = "" }) {
  const safeValue = Number.isFinite(Number(value)) ? Number(value) : min;

  const updateValue = (nextValue) => {
    onChange(Math.max(min, nextValue));
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-10 w-10 shrink-0"
        onClick={() => updateValue(safeValue - 1)}
      >
        <Minus className="w-4 h-4" />
      </Button>
      <Input
        type="text"
        inputMode="numeric"
        value={safeValue}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "");
          updateValue(digits ? parseInt(digits, 10) : min);
        }}
        className="h-10 text-center text-sm font-medium"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-10 w-10 shrink-0"
        onClick={() => updateValue(safeValue + 1)}
      >
        <Plus className="w-4 h-4" />
      </Button>
    </div>
  );
}