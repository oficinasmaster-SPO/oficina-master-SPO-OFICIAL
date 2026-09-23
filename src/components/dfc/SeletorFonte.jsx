import React, { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { AlertCircle, Building2 } from "lucide-react";
import Combobox from "@/components/ui/combobox";

const fmtBRL = (v) =>
  (v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Seletor de fonte de dinheiro (banco / máquina de cartão / caixa).
 * Usa o Combobox padrão do sistema — com busca embutida e highlight.
 *
 * Props:
 *   fontes          – objeto { bancos[], maquinas_cartao[], caixa }
 *   fonteSelecionada – chave atual no formato "banco:<id>:<nome>" | "maquina:<id>:<nome>" | "caixa:caixa:Caixa"
 *   onChange        – callback(chave)
 *   label           – texto do Label (opcional)
 */
export default function SeletorFonte({
  fontes,
  fonteSelecionada,
  onChange,
  label = "De onde saiu o dinheiro?",
}) {
  const bancos    = fontes?.bancos          || [];
  const maquinas  = fontes?.maquinas_cartao || [];
  const caixa     = fontes?.caixa           || 0;
  const temFontes = bancos.length > 0 || maquinas.length > 0 || caixa > 0;

  // Monta as options no formato esperado pelo Combobox
  const options = useMemo(() => {
    const opts = [];

    bancos.forEach((b) =>
      opts.push({
        value: `banco:${b.id}:${b.nome}`,
        label: `🏦 ${b.nome} — R$ ${fmtBRL(b.saldo)}`,
      })
    );

    maquinas.forEach((m) =>
      opts.push({
        value: `maquina:${m.id}:${m.nome}`,
        label: `💳 ${m.nome} — R$ ${fmtBRL(m.saldo)}`,
      })
    );

    if (caixa > 0) {
      opts.push({
        value: "caixa:caixa:Caixa",
        label: `💵 Caixa — R$ ${fmtBRL(caixa)}`,
      });
    }

    return opts;
  }, [bancos, maquinas, caixa]);

  return (
    <div>
      {label && (
        <Label className="flex items-center gap-2 mb-1">
          <Building2 className="w-4 h-4 text-blue-600" />
          {label}
        </Label>
      )}

      {!temFontes ? (
        <div className="p-2 rounded-md border border-yellow-200 bg-yellow-50 text-xs text-yellow-700 flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          Nenhum banco ou máquina cadastrado no Saldo Inicial deste mês.
          Cadastre em <strong>Saldo Inicial Detalhado</strong> para vincular a fonte.
        </div>
      ) : (
        <Combobox
          options={options}
          value={fonteSelecionada}
          onChange={onChange}
          placeholder="Selecione a conta..."
          searchPlaceholder="Buscar conta..."
          emptyText="Nenhuma conta encontrada."
          clearValue=""
        />
      )}
    </div>
  );
}
