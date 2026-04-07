import React from "react";
import { Check, Loader2, Cloud } from "lucide-react";

export default function AutoSaveIndicator({ status }) {
  if (status === "saving") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-blue-600 animate-pulse">
        <Loader2 className="w-3 h-3 animate-spin" />
        Salvando...
      </div>
    );
  }

  if (status === "saved") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-green-600">
        <Check className="w-3 h-3" />
        Salvo automaticamente
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-red-500">
        <Cloud className="w-3 h-3" />
        Erro ao salvar
      </div>
    );
  }

  return null;
}