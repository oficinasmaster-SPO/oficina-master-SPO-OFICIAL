import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Building2, CreditCard, Banknote } from "lucide-react";

export default function FonteSaidaSelector({ value, onChange, disabled }) {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold">📍 De onde sai o dinheiro?</Label>
      <p className="text-xs text-gray-500">Selecione a fonte para subtrair deste valor</p>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Banco */}
        <label className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
          value === "banco" 
            ? "border-blue-500 bg-blue-50" 
            : "border-gray-200 hover:border-gray-300"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}>
          <Checkbox
            checked={value === "banco"}
            onCheckedChange={() => !disabled && onChange("banco")}
            className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
            disabled={disabled}
          />
          <Building2 className={`w-5 h-5 ${value === "banco" ? "text-blue-600" : "text-gray-400"}`} />
          <div className="flex-1">
            <p className={`text-sm font-medium ${value === "banco" ? "text-blue-900" : "text-gray-700"}`}>
              Banco
            </p>
            <p className="text-xs text-gray-500">Conta corrente</p>
          </div>
        </label>

        {/* Máquina Cartão */}
        <label className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
          value === "maquina_cartao" 
            ? "border-green-500 bg-green-50" 
            : "border-gray-200 hover:border-gray-300"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}>
          <Checkbox
            checked={value === "maquina_cartao"}
            onCheckedChange={() => !disabled && onChange("maquina_cartao")}
            className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
            disabled={disabled}
          />
          <CreditCard className={`w-5 h-5 ${value === "maquina_cartao" ? "text-green-600" : "text-gray-400"}`} />
          <div className="flex-1">
            <p className={`text-sm font-medium ${value === "maquina_cartao" ? "text-green-900" : "text-gray-700"}`}>
              Máquina
            </p>
            <p className="text-xs text-gray-500">Recebíveis cartão</p>
          </div>
        </label>

        {/* Caixa */}
        <label className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
          value === "caixa" 
            ? "border-amber-500 bg-amber-50" 
            : "border-gray-200 hover:border-gray-300"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}>
          <Checkbox
            checked={value === "caixa"}
            onCheckedChange={() => !disabled && onChange("caixa")}
            className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
            disabled={disabled}
          />
          <Banknote className={`w-5 h-5 ${value === "caixa" ? "text-amber-600" : "text-gray-400"}`} />
          <div className="flex-1">
            <p className={`text-sm font-medium ${value === "caixa" ? "text-amber-900" : "text-gray-700"}`}>
              Caixa
            </p>
            <p className="text-xs text-gray-500">Dinheiro físico</p>
          </div>
        </label>
      </div>
    </div>
  );
}