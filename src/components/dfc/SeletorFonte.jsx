import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { AlertCircle, Building2 } from "lucide-react";

export default function SeletorFonte({ fontes, fonteSelecionada, onChange, label = "De onde saiu o dinheiro?" }) {
  const bancos = fontes?.bancos || [];
  const maquinas = fontes?.maquinas_cartao || [];
  const caixa = fontes?.caixa || 0;
  const temFontes = bancos.length > 0 || maquinas.length > 0 || caixa > 0;

  return (
    <div>
      {label && (
        <Label className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-600" />
          {label}
        </Label>
      )}
      {!temFontes ? (
        <div className="mt-1 p-2 rounded-md border border-yellow-200 bg-yellow-50 text-xs text-yellow-700 flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          Nenhum banco ou máquina cadastrado no Saldo Inicial deste mês. Cadastre em <strong>Saldo Inicial Detalhado</strong> para vincular a fonte.
        </div>
      ) : (
        <Select value={fonteSelecionada} onValueChange={onChange}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Selecione a fonte..." />
          </SelectTrigger>
          <SelectContent>
            {bancos.map((b) => (
              <SelectItem key={`banco-${b.id}`} value={`banco:${b.id}:${b.nome}`}>
                🏦 {b.nome} — R$ {(b.saldo || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </SelectItem>
            ))}
            {maquinas.map((m) => (
              <SelectItem key={`maq-${m.id}`} value={`maquina:${m.id}:${m.nome}`}>
                💳 {m.nome} — R$ {(m.saldo || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </SelectItem>
            ))}
            {caixa > 0 && (
              <SelectItem value="caixa:caixa:Caixa">
                💵 Caixa — R$ {caixa.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}