import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "../utils/formatters";
import { ChevronDown, ChevronRight, TrendingDown, TrendingUp, AlertCircle } from "lucide-react";

const CATEGORIA_LABELS = {
  operacional: { label: "Operacional", color: "bg-blue-100 text-blue-700", tcmp2: true },
  pessoas: { label: "Pessoas", color: "bg-purple-100 text-purple-700", tcmp2: true },
  marketing: { label: "Marketing", color: "bg-pink-100 text-pink-700", tcmp2: true },
  manutencao: { label: "Manutenção", color: "bg-yellow-100 text-yellow-700", tcmp2: true },
  terceirizados: { label: "Terceirizados", color: "bg-indigo-100 text-indigo-700", tcmp2: true },
  administrativo: { label: "Administrativo", color: "bg-cyan-100 text-cyan-700", tcmp2: true },
  financeiro: { label: "Financeiro/Invest.", color: "bg-orange-100 text-orange-700", tcmp2: false },
  pecas_estoque: { label: "Peças Estoque", color: "bg-gray-100 text-gray-700", tcmp2: false },
  pecas_aplicadas: { label: "Peças Aplicadas", color: "bg-teal-100 text-teal-700", tcmp2: false },
  servicos: { label: "Serviços", color: "bg-green-100 text-green-700", tcmp2: false },
  outras: { label: "Outras Receitas", color: "bg-emerald-100 text-emerald-700", tcmp2: false },
};

function LinhaCategoria({ catKey, itens, onSelectItem }) {
  const [open, setOpen] = useState(false);
  const cat = CATEGORIA_LABELS[catKey] || { label: catKey, color: "bg-gray-100 text-gray-700", tcmp2: false };
  const total = itens.reduce((s, i) => s + (i.valor || 0), 0);
  const isDespesa = itens[0]?.tipo === "despesa";

  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
          <Badge className={`text-xs font-medium ${cat.color}`}>{cat.label}</Badge>
          {isDespesa && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${cat.tcmp2 ? "bg-blue-50 text-blue-600" : "bg-red-50 text-red-500"}`}>
              {cat.tcmp2 ? "TCMP²" : "Fora TCMP²"}
            </span>
          )}
          <span className="text-xs text-gray-500">{itens.length} lançamento{itens.length > 1 ? "s" : ""}</span>
        </div>
        <span className={`font-bold text-sm ${isDespesa ? "text-red-700" : "text-green-700"}`}>
          {isDespesa ? "-" : "+"}{formatCurrency(total)}
        </span>
      </button>

      {open && (
        <div className="border-t border-gray-100 bg-gray-50 divide-y divide-gray-100">
          {itens.map((item, i) => (
            <button
              key={item.id || i}
              onClick={() => onSelectItem(item)}
              className="w-full flex justify-between items-center px-4 py-1.5 text-sm hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <span className="text-gray-600 truncate max-w-[60%]">{item.descricao || item.subcategoria || "—"}</span>
              <span className={`font-medium ${isDespesa ? "text-red-600" : "text-green-600"}`}>
                {formatCurrency(item.valor)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BudgetDREResumoCard({ lancamentos = [], onSelectDREItem }) {
  const [abaAtiva, setAbaAtiva] = useState("despesas");

  if (!lancamentos.length) {
    return (
      <Card className="border-2 border-dashed border-gray-200">
        <CardContent className="py-8 text-center text-gray-400">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhum lançamento no DRE Avançado para este mês.</p>
          <p className="text-xs mt-1">Acesse a aba <strong>"DRE Avançado"</strong> e adicione receitas e despesas.</p>
        </CardContent>
      </Card>
    );
  }

  const despesas = lancamentos.filter(l => l.tipo === "despesa");
  const receitas = lancamentos.filter(l => l.tipo === "receita");

  const totalDespesas = despesas.reduce((s, l) => s + (l.valor || 0), 0);
  const totalReceitas = receitas.reduce((s, l) => s + (l.valor || 0), 0);
  const totalTcmp2 = despesas.filter(l => l.entra_tcmp2).reduce((s, l) => s + (l.valor || 0), 0);
  const totalForaTcmp2 = despesas.filter(l => !l.entra_tcmp2).reduce((s, l) => s + (l.valor || 0), 0);
  const resultado = totalReceitas - totalDespesas;

  // Agrupar por categoria
  const agrupar = (lista) =>
    lista.reduce((acc, item) => {
      const key = item.categoria || "outras";
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});

  const gruposDespesas = agrupar(despesas);
  const gruposReceitas = agrupar(receitas);
  const gruposAtivos = abaAtiva === "despesas" ? gruposDespesas : gruposReceitas;

  return (
    <Card className="border-2 border-gray-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            📋 Lançamentos do DRE Avançado
            <Badge variant="outline" className="text-xs font-normal text-gray-500">
              {lancamentos.length} registros
            </Badge>
          </CardTitle>
          {/* KPIs rápidos */}
          <div className="flex gap-3 text-xs">
            <span className="flex items-center gap-1 text-green-700 font-semibold">
              <TrendingUp className="w-3.5 h-3.5" /> {formatCurrency(totalReceitas)}
            </span>
            <span className="flex items-center gap-1 text-red-700 font-semibold">
              <TrendingDown className="w-3.5 h-3.5" /> {formatCurrency(totalDespesas)}
            </span>
            <span className={`font-bold ${resultado >= 0 ? "text-emerald-700" : "text-red-700"}`}>
              = {resultado >= 0 ? "+" : ""}{formatCurrency(resultado)}
            </span>
          </div>
        </div>

        {/* Barra resumo TCMP² */}
        {despesas.length > 0 && (
          <div className="mt-3 p-3 bg-blue-50 rounded-lg grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-blue-600 font-medium mb-0.5">Custos TCMP² (Operacionais)</p>
              <p className="text-blue-900 font-bold text-base">{formatCurrency(totalTcmp2)}</p>
            </div>
            <div>
              <p className="text-orange-600 font-medium mb-0.5">Fora TCMP² (Financeiros)</p>
              <p className="text-orange-900 font-bold text-base">{formatCurrency(totalForaTcmp2)}</p>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Sub-tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setAbaAtiva("despesas")}
            className={`flex-1 text-xs py-1.5 px-2 rounded-md font-medium transition-all ${abaAtiva === "despesas" ? "bg-white shadow text-red-700" : "text-gray-500 hover:text-gray-700"}`}
          >
            📉 Despesas ({formatCurrency(totalDespesas)})
          </button>
          <button
            onClick={() => setAbaAtiva("receitas")}
            className={`flex-1 text-xs py-1.5 px-2 rounded-md font-medium transition-all ${abaAtiva === "receitas" ? "bg-white shadow text-green-700" : "text-gray-500 hover:text-gray-700"}`}
          >
            💰 Receitas ({formatCurrency(totalReceitas)})
          </button>
        </div>

        {/* Lista por categoria */}
        <div className="space-y-2">
           {Object.keys(gruposAtivos).length === 0 ? (
             <p className="text-center text-gray-400 py-4 text-sm">
               Nenhum lançamento de {abaAtiva === "despesas" ? "despesa" : "receita"} neste mês.
             </p>
           ) : (
             Object.entries(gruposAtivos).map(([catKey, itens]) => (
               <LinhaCategoria key={catKey} catKey={catKey} itens={itens} onSelectItem={onSelectDREItem} />
             ))
           )}
         </div>

        {/* Rodapé totais */}
        <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
          <span className="text-sm font-semibold text-gray-700">
            Total {abaAtiva === "despesas" ? "Despesas" : "Receitas"}
          </span>
          <span className={`text-lg font-bold ${abaAtiva === "despesas" ? "text-red-700" : "text-green-700"}`}>
            {abaAtiva === "despesas" ? "-" : "+"}{formatCurrency(abaAtiva === "despesas" ? totalDespesas : totalReceitas)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}