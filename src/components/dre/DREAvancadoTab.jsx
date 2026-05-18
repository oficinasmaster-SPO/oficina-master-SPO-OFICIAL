import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Trash2, ArrowUpCircle, ArrowDownCircle,
  CheckCircle, AlertCircle, BarChart3, TrendingUp, TrendingDown,
  ChevronDown, ChevronUp, Loader2, RefreshCw
} from "lucide-react";
import { formatCurrency } from "@/components/utils/formatters";
import { toast } from "sonner";
import SubcategoriaSelector from "./SubcategoriaSelector";
import FiltroPeriodo from "./FiltroPeriodo";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, Legend } from "recharts";

// ─── CATEGORIAS ───────────────────────────────────────────────────────────────
const CATEGORIAS_DESPESA = {
  operacional: {
    label: "Operacional",
    entra_tcmp2: true,
    subcategorias: ["Aluguel", "Energia elétrica", "Água e esgoto", "Telefone / Internet", "IPTU", "Seguro predial"]
  },
  pessoas: {
    label: "Pessoas",
    entra_tcmp2: true,
    subcategorias: ["Salários", "FGTS", "INSS", "Vale transporte", "Vale refeição", "Férias / 13º (provisão)", "Pró-labore sócios"]
  },
  marketing: {
    label: "Marketing",
    entra_tcmp2: true,
    subcategorias: ["Tráfego pago (Meta/Google)", "Agência de marketing", "Material gráfico", "Patrocínios", "Uniforme / Branding"]
  },
  manutencao: {
    label: "Manutenção",
    entra_tcmp2: true,
    subcategorias: ["Manutenção predial", "Manutenção de equipamentos", "Ferramentas", "EPI"]
  },
  terceirizados: {
    label: "Serviços Terceiros",
    entra_tcmp2: true,
    subcategorias: ["Contabilidade", "Advocacia", "Consultoria", "TI / Software de gestão", "Limpeza / Segurança"]
  },
  administrativo: {
    label: "Administrativo",
    entra_tcmp2: true,
    subcategorias: ["Material de escritório", "Taxas bancárias", "Impostos sobre serviço", "Certificações", "Seguros gerais"]
  },
  financeiro: {
    label: "Financeiro / Investimento",
    entra_tcmp2: false,
    subcategorias: ["Financiamento (veículo/imóvel)", "Consórcio", "Parcelamento de equipamento", "Empréstimo bancário", "Processos judiciais", "Compra de imóvel/terreno"]
  },
  pecas_estoque: {
    label: "Peças para Estoque",
    entra_tcmp2: false,
    subcategorias: ["Boleto de peças (estoque)", "Compra antecipada", "Devolução de peças"]
  }
};

const CATEGORIAS_RECEITA = {
  pecas_aplicadas: {
    label: "Peças Aplicadas",
    subcategorias: ["Peças mecânicas", "Peças elétricas", "Funilaria / Pintura", "Pneus / Rodas", "Acessórios"]
  },
  servicos: {
    label: "Serviços (Mão de Obra)",
    subcategorias: ["Revisão / Manutenção", "Funilaria", "Pintura", "Alinhamento / Balanceamento", "Elétrica / Scanner", "Vidros / Insulfilm"]
  },
  outras: {
    label: "Outras Receitas",
    subcategorias: ["Venda de sucata", "Locadora / Seguradora", "Franquia / Repasse", "Outros"]
  }
};

// ─── FORMULÁRIO DE LANÇAMENTO ─────────────────────────────────────────────────
function FormLancamento({ tipo, workshopId, mes, onSuccess, onCancel }) {
  const [catKey, setCatKey] = useState("");
  const [subcat, setSubcat] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [dataVencimento, setDataVencimento] = useState("");
  const [dataPagamento, setDataPagamento] = useState("");
  const [saving, setSaving] = useState(false);

  const categorias = tipo === "receita" ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA;
  const catSelecionada = categorias[catKey];

  // Validação: subcategoria obrigatória
  const handleSave = async () => {
    if (!catKey || !valor || !descricao) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    if (!subcat) {
      toast.error("Selecione uma subcategoria");
      return;
    }
    const valorNum = parseFloat(String(valor).replace(",", "."));
    if (isNaN(valorNum) || valorNum <= 0) {
      toast.error("Informe um valor maior que zero");
      return;
    }

    setSaving(true);
    try {
      const novoLancamento = await base44.entities.DRELancamento.create({
        workshop_id: workshopId,
        mes,
        tipo,
        categoria: catKey,
        subcategoria: subcat || (catSelecionada?.subcategorias[0] ?? ""),
        descricao,
        valor: valorNum,
        entra_tcmp2: catSelecionada?.entra_tcmp2 ?? true,
        ...(dataVencimento && { data_vencimento: dataVencimento }),
        ...(dataPagamento && { data_pagamento: dataPagamento }),
      });

      // Invalidar queries do Controle Orçamentário em tempo real
      window.dispatchEvent(new CustomEvent('dre-lancamento-criado', { 
        detail: { workshop_id: workshopId, mes, lancamento: novoLancamento } 
      }));

      toast.success("Lançamento adicionado!");
      onSuccess();
    } catch (e) {
      toast.error("Erro ao salvar lançamento");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-blue-50 border-2 border-dashed border-blue-200 rounded-xl p-4 space-y-3">
      <p className="text-sm font-semibold text-blue-700">
        {tipo === "receita" ? "💰 Novo Lançamento de Receita" : "📋 Novo Lançamento de Despesa"}
      </p>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Categoria *</label>
          <select
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
            value={catKey}
            onChange={e => { setCatKey(e.target.value); setSubcat(""); }}
          >
            <option value="">Selecione...</option>
            {Object.entries(categorias).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Subcategoria *</label>
          <SubcategoriaSelector
            categoria={catKey}
            workshopId={workshopId}
            value={subcat}
            onChange={setSubcat}
            disabled={!catKey}
            placeholder="Selecione ou crie..."
          />
        </div>
      </div>

      {/* Alerta TCMP² automático */}
      {catKey && tipo === "despesa" && (
        <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${catSelecionada?.entra_tcmp2 ? "bg-blue-100 text-blue-700" : "bg-red-50 text-red-700"}`}>
          {catSelecionada?.entra_tcmp2
            ? <><CheckCircle className="w-3 h-3 flex-shrink-0" /> Este custo <strong className="ml-1">ENTRA</strong> no cálculo do TCMP²</>
            : <><AlertCircle className="w-3 h-3 flex-shrink-0" /> Este custo <strong className="ml-1">NÃO ENTRA</strong> no cálculo do TCMP²</>
          }
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Descrição *</label>
          <input
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
            placeholder="Ex: Energia elétrica maio"
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Valor (R$) *</label>
          <input
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 text-right font-mono"
            placeholder="0,00"
            value={valor}
            onChange={e => setValor(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">📅 Vencimento <span className="text-gray-400">(opcional)</span></label>
          <input
            type="date"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
            value={dataVencimento}
            onChange={e => setDataVencimento(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">✅ Data Pagamento <span className="text-gray-400">(opcional)</span></label>
          <input
            type="date"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-green-300"
            value={dataPagamento}
            onChange={e => setDataPagamento(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 flex-1">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
          Adicionar
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  );
}

// ─── LINHA DE LANÇAMENTO (com edição inline ao clicar) ───────────────────────
function LancamentoRow({ item, onDelete, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  // campos editáveis
  const categorias = item.tipo === "receita" ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA;
  const cat = categorias[item.categoria];

  const [catKey, setCatKey]       = useState(item.categoria);
  const [subcat, setSubcat]       = useState(item.subcategoria || "");
  const [descricao, setDescricao] = useState(item.descricao || "");
  const [valor, setValor]         = useState(String(item.valor));
  const [dataVencimento, setDataVencimento] = useState(item.data_vencimento || "");
  const [dataPagamento, setDataPagamento]   = useState(item.data_pagamento || "");

  const catSelecionada = categorias[catKey];

  const handleDelete = async (e) => {
    e.stopPropagation();
    setDeleting(true);
    try {
      await base44.entities.DRELancamento.delete(item.id);
      onDelete();
    } catch {
      toast.error("Erro ao excluir");
      setDeleting(false);
    }
  };

  const handleSave = async () => {
    const valorNum = parseFloat(String(valor).replace(",", "."));
    if (!catKey || !descricao || isNaN(valorNum) || valorNum <= 0) {
      toast.error("Preencha todos os campos corretamente");
      return;
    }
    setSaving(true);
    try {
      await base44.entities.DRELancamento.update(item.id, {
        categoria: catKey,
        subcategoria: subcat,
        descricao,
        valor: valorNum,
        entra_tcmp2: catSelecionada?.entra_tcmp2 ?? item.entra_tcmp2,
        data_vencimento: dataVencimento || null,
        data_pagamento: dataPagamento || null,
      });
      // Propagar edição para DFC e Controle Orçamentário via custom event
      window.dispatchEvent(new CustomEvent('dre-lancamento-criado', {
        detail: { workshop_id: item.workshop_id, mes: item.mes }
      }));
      toast.success("Lançamento atualizado!");
      setEditing(false);
      onSaved();
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // restaurar valores originais
    setCatKey(item.categoria);
    setSubcat(item.subcategoria || "");
    setDescricao(item.descricao || "");
    setValor(String(item.valor));
    setDataVencimento(item.data_vencimento || "");
    setDataPagamento(item.data_pagamento || "");
    setEditing(false);
  };

  // ── MODO EDIÇÃO ──────────────────────────────────────────────────────────────
  if (editing) {
    return (
      <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-amber-700">✏️ Editando lançamento</p>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Categoria</label>
            <select
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
              value={catKey}
              onChange={e => { setCatKey(e.target.value); setSubcat(""); }}
            >
              {Object.entries(categorias).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Subcategoria</label>
            <SubcategoriaSelector
              categoria={catKey}
              workshopId={item.workshop_id}
              value={subcat}
              onChange={setSubcat}
              placeholder="Selecione ou crie..."
            />
          </div>
        </div>

        {catKey && item.tipo === "despesa" && (
          <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${catSelecionada?.entra_tcmp2 ? "bg-blue-100 text-blue-700" : "bg-red-50 text-red-700"}`}>
            {catSelecionada?.entra_tcmp2
              ? <><CheckCircle className="w-3 h-3 flex-shrink-0" /> <strong>ENTRA</strong> no cálculo do TCMP²</>
              : <><AlertCircle className="w-3 h-3 flex-shrink-0" /> <strong>NÃO ENTRA</strong> no cálculo do TCMP²</>
            }
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Descrição</label>
            <input
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Valor (R$)</label>
            <input
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 text-right font-mono"
              value={valor}
              onChange={e => setValor(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">📅 Vencimento</label>
            <input
              type="date"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
              value={dataVencimento}
              onChange={e => setDataVencimento(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">✅ Pago em</label>
            <input
              type="date"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-green-300"
              value={dataPagamento}
              onChange={e => setDataPagamento(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-white flex-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            Salvar alterações
          </Button>
          <Button size="sm" variant="outline" onClick={handleCancel}>Cancelar</Button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="ml-auto text-xs text-red-500 hover:text-red-700 flex items-center gap-1 px-2"
          >
            {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
            Excluir
          </button>
        </div>
      </div>
    );
  }

  // ── MODO LEITURA ─────────────────────────────────────────────────────────────
  return (
    <div
      onClick={() => setEditing(true)}
      className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-lg hover:border-amber-300 hover:bg-amber-50/30 transition-colors group cursor-pointer"
      title="Clique para editar"
    >
      <div className={`w-1.5 h-8 rounded-full flex-shrink-0 ${item.tipo === "receita" ? "bg-green-400" : item.entra_tcmp2 ? "bg-blue-400" : "bg-red-400"}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{item.descricao}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-400">{cat?.label ?? item.categoria}</span>
          {item.subcategoria && <span className="text-xs text-gray-400">· {item.subcategoria}</span>}
          {item.tipo === "despesa" && (
            item.entra_tcmp2
              ? <span className="text-xs text-blue-600">✅ TCMP²</span>
              : <span className="text-xs text-red-500">🚫 Fora TCMP²</span>
          )}
        </div>
      </div>
      <span className={`font-bold text-sm flex-shrink-0 ${item.tipo === "receita" ? "text-green-600" : "text-red-600"}`}>
        {item.tipo === "receita" ? "+" : "-"} {formatCurrency(item.valor)}
      </span>
      {/* hint de edição visível no hover */}
      <span className="opacity-0 group-hover:opacity-60 text-xs text-gray-400 flex-shrink-0 transition-opacity">✏️</span>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all flex-shrink-0"
      >
        {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
      </button>
    </div>
  );
}

// ─── SEÇÃO AGRUPADA POR CATEGORIA ────────────────────────────────────────────
function GrupoCategoria({ catKey, label, itens, tipo, onDelete, onSaved }) {
  const [expanded, setExpanded] = useState(true);
  const total = itens.reduce((s, i) => s + i.valor, 0);

  return (
    <div className="space-y-1">
      <button
        className="w-full flex items-center justify-between py-1.5 px-1 hover:bg-gray-50 rounded transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold ${tipo === "receita" ? "text-green-700" : "text-red-700"}`}>
            {formatCurrency(total)}
          </span>
          {expanded ? <ChevronUp className="w-3 h-3 text-gray-400" /> : <ChevronDown className="w-3 h-3 text-gray-400" />}
        </div>
      </button>
      {expanded && itens.map(item => (
        <LancamentoRow key={item.id} item={item} onDelete={onDelete} onSaved={onSaved} />
      ))}
    </div>
  );
}

// ─── PAINEL DE ANÁLISE ────────────────────────────────────────────────────────
function PainelAnalise({ lancamentos, tecnicosCount, horasMes }) {
  const receitas = lancamentos.filter(l => l.tipo === "receita");
  const despesas = lancamentos.filter(l => l.tipo === "despesa");

  const totalReceita = receitas.reduce((s, l) => s + l.valor, 0);
  const totalTcmp2 = despesas.filter(l => l.entra_tcmp2).reduce((s, l) => s + l.valor, 0);
  // Custos financeiros/investimento (não TCMP², exceto pecas_estoque que vai em linha própria)
  const totalNaoTcmp2 = despesas.filter(l => !l.entra_tcmp2 && l.categoria !== "pecas_estoque").reduce((s, l) => s + l.valor, 0);
  // Peças para estoque são registradas separadamente (não duplicar em totalNaoTcmp2)
  const custoPecas = despesas.filter(l => l.categoria === "pecas_estoque").reduce((s, l) => s + l.valor, 0);

  const receitaPecas = receitas.filter(l => l.categoria === "pecas_aplicadas").reduce((s, l) => s + l.valor, 0);
  const receitaServicos = receitas.filter(l => l.categoria === "servicos").reduce((s, l) => s + l.valor, 0);
  const receitaOutras = receitas.filter(l => l.categoria === "outras").reduce((s, l) => s + l.valor, 0);

  const lucro = totalReceita - totalTcmp2 - totalNaoTcmp2 - custoPecas;
  const margemLucro = totalReceita > 0 ? (lucro / totalReceita) * 100 : 0;
  const totalHoras = (tecnicosCount || 1) * (horasMes || 219);
  const tcmp2 = totalHoras > 0 ? totalTcmp2 / totalHoras : 0;
  // R70/I30 = (Receita - Peças Aplicadas - Peças Estoque) / Receita
  const partsAppliedCost = despesas.filter(l => l.categoria === "pecas_aplicadas").reduce((s, l) => s + l.valor, 0);
  const r70 = totalReceita > 0 ? ((totalReceita - partsAppliedCost - custoPecas) / totalReceita) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-3 text-white">
          <p className="text-xs opacity-75">Receita Total</p>
          <p className="text-xl font-bold">{formatCurrency(totalReceita)}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-3 text-white">
          <p className="text-xs opacity-75">TCMP² / hora</p>
          <p className="text-xl font-bold">{formatCurrency(tcmp2)}</p>
          <p className="text-xs opacity-60">{tecnicosCount} téc × {horasMes}h</p>
        </div>
        <div className={`bg-gradient-to-br ${r70 >= 70 ? "from-purple-500 to-pink-600" : "from-orange-500 to-red-600"} rounded-xl p-3 text-white`}>
          <p className="text-xs opacity-75">R70 / I30</p>
          <p className="text-xl font-bold">{r70.toFixed(0)}% / {(100 - r70).toFixed(0)}%</p>
          <p className="text-xs opacity-80">{r70 >= 70 ? "✅ Meta atingida" : "⚠️ Abaixo da meta"}</p>
        </div>
        <div className={`bg-gradient-to-br ${lucro >= 0 ? "from-emerald-500 to-teal-600" : "from-red-500 to-rose-600"} rounded-xl p-3 text-white`}>
          <p className="text-xs opacity-75">Lucro Estimado</p>
          <p className="text-xl font-bold">{formatCurrency(lucro)}</p>
          <p className="text-xs opacity-80">{margemLucro.toFixed(1)}% margem</p>
        </div>
      </div>

      {/* Waterfall - Demonstrativo de Resultado Expandido */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
        <p className="text-sm font-semibold text-gray-700 mb-3">Demonstrativo de Resultado</p>
        
        {/* RECEITAS */}
        <div className="space-y-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Receitas</p>
          {receitas.filter(l => l.categoria === "pecas_aplicadas").length > 0 && (
            <div className="flex items-center justify-between text-sm py-1 pl-2 border-l-2 border-green-500">
              <span className="text-gray-600">Peças Aplicadas</span>
              <span className="font-semibold text-green-700">+ {formatCurrency(receitaPecas)}</span>
            </div>
          )}
          {receitas.filter(l => l.categoria === "servicos").length > 0 && (
            <div className="flex items-center justify-between text-sm py-1 pl-2 border-l-2 border-green-500">
              <span className="text-gray-600">Serviços</span>
              <span className="font-semibold text-green-700">+ {formatCurrency(receitaServicos)}</span>
            </div>
          )}
          {receitas.filter(l => l.categoria === "outras").length > 0 && (
            <div className="flex items-center justify-between text-sm py-1 pl-2 border-l-2 border-green-500">
              <span className="text-gray-600">Outras Receitas</span>
              <span className="font-semibold text-green-700">+ {formatCurrency(totalReceita - receitaPecas - receitaServicos)}</span>
            </div>
          )}
        </div>

        {/* DESPESAS POR CATEGORIA */}
        <div className="space-y-1 mt-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Despesas por Categoria</p>
          
          {/* Agrupar despesas por categoria */}
          {(() => {
            const categoriasDespesas = despesas.reduce((acc, d) => {
              if (!acc[d.categoria]) {
                acc[d.categoria] = { label: CATEGORIAS_DESPESA[d.categoria]?.label ?? d.categoria, valor: 0, entra_tcmp2: d.entra_tcmp2 };
              }
              acc[d.categoria].valor += d.valor;
              return acc;
            }, {});

            const ordemCategorias = ["operacional", "pessoas", "marketing", "manutencao", "terceirizados", "administrativo", "financeiro", "pecas_estoque"];
            
            return ordemCategorias
              .filter(cat => categoriasDespesas[cat] && categoriasDespesas[cat].valor > 0)
              .map((cat, i) => (
                <div key={cat} className={`flex items-center justify-between text-sm py-1 pl-2 border-l-2 ${categoriasDespesas[cat].entra_tcmp2 ? "border-blue-500" : "border-orange-500"}`}>
                  <span className="text-gray-600">{categoriasDespesas[cat].label}</span>
                  <span className={`font-semibold ${categoriasDespesas[cat].entra_tcmp2 ? "text-blue-700" : "text-orange-700"}`}>
                    - {formatCurrency(categoriasDespesas[cat].valor)}
                  </span>
                </div>
              ));
          })()}
        </div>

        {/* TOTALIZADORES */}
        <div className="space-y-1 mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm py-1">
            <span className="text-gray-600 font-medium">Total TCMP²</span>
            <span className="font-semibold text-blue-700">- {formatCurrency(totalTcmp2)}</span>
          </div>
          <div className="flex items-center justify-between text-sm py-1">
            <span className="text-gray-600 font-medium">Total Não-TCMP²</span>
            <span className="font-semibold text-orange-700">- {formatCurrency(totalNaoTcmp2)}</span>
          </div>
          <div className="flex items-center justify-between text-sm py-1">
            <span className="text-gray-600 font-medium">Peças / Estoque</span>
            <span className="font-semibold text-purple-700">- {formatCurrency(custoPecas)}</span>
          </div>
        </div>

        {/* LUCRO LÍQUIDO */}
        <div className="flex items-center justify-between pt-3 border-t-2 border-gray-300 mt-2">
          <span className="font-bold text-gray-800">= Lucro Liquido</span>
          <span className={lucro >= 0 ? "font-bold text-lg text-emerald-700" : "font-bold text-lg text-red-700"}>
            {formatCurrency(lucro)} ({margemLucro.toFixed(1)}%)
          </span>
        </div>
      </div>

      {/* Mix Receita */}
      {totalReceita > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-500 mb-2">Mix de Receita</p>
          <div className="flex gap-0.5 h-5 rounded-full overflow-hidden">
            <div className="bg-green-500 transition-all" style={{ width: ((receitaPecas / totalReceita) * 100) + "%" }} />
            <div className="bg-emerald-400 transition-all" style={{ width: ((receitaServicos / totalReceita) * 100) + "%" }} />
            <div className="bg-cyan-400 transition-all" style={{ width: (((totalReceita - receitaPecas - receitaServicos) / totalReceita) * 100) + "%" }} />
          </div>
          <div className="flex gap-4 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-green-500 inline-block" /> Peças: {((receitaPecas / totalReceita) * 100).toFixed(0)}%</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-400 inline-block" /> Serviços: {((receitaServicos / totalReceita) * 100).toFixed(0)}%</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-cyan-400 inline-block" /> Outros: {(((totalReceita - receitaPecas - receitaServicos) / totalReceita) * 100).toFixed(0)}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function DREAvancadoTab({ workshopId, mes, tecnicosCount, horasMes, onConsolidar }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(null); // 'receita' | 'despesa' | null
  const [abaAtiva, setAbaAtiva] = useState("todos"); // todos | receitas | despesas | analise
  const [periodo, setPeriodo] = useState("mensal"); // mensal | anual
  const [ano, setAno] = useState(new Date().getFullYear());
  
  // Extrair mês do parâmetro (formato YYYY-MM)
  const mesAtual = mes ? mes.split('-')[1] : "01";
  const anoAtual = mes ? parseInt(mes.split('-')[0]) : new Date().getFullYear();

  // Query para dados anuais
  const { data: dadosAnuais, isLoading: isLoadingAnual } = useQuery({
    queryKey: ["dre-anual", workshopId, ano],
    queryFn: () => base44.functions.invoke('getDREDataAnual', { workshop_id: workshopId, ano }),
    enabled: periodo === "anual" && !!workshopId && !!ano
  });

  // Query para dados mensais (padrão)
  const { data: lancamentos = [], isLoading, refetch } = useQuery({
    queryKey: ["dre-lancamentos", workshopId, mes],
    queryFn: () => base44.entities.DRELancamento.filter({ workshop_id: workshopId, mes }, "-created_date", 200),
    enabled: periodo === "mensal" && !!workshopId && !!mes
  });

  // Real-time: atualizar quando novo DRELancamento é criado/deletado
  useEffect(() => {
    if (!workshopId || !mes) return;
    
    const unsubscribe = base44.entities.DRELancamento.subscribe((event) => {
      const relevante = event.data?.workshop_id === workshopId && event.data?.mes === mes;
      if (relevante && (event.type === 'create' || event.type === 'delete' || event.type === 'update')) {
        refetch();
      }
    });

    return unsubscribe;
  }, [workshopId, mes, refetch]);

  const refresh = () => refetch();

  // Totais para consolidação
  const totaisConsolidados = useMemo(() => {
    const receitas = lancamentos.filter(l => l.tipo === "receita");
    const despesas = lancamentos.filter(l => l.tipo === "despesa");
    return {
      revenue: {
        parts_applied: receitas.filter(l => l.categoria === "pecas_aplicadas").reduce((s, l) => s + l.valor, 0),
        services: receitas.filter(l => l.categoria === "servicos").reduce((s, l) => s + l.valor, 0),
        other: receitas.filter(l => l.categoria === "outras").reduce((s, l) => s + l.valor, 0),
      },
      costs_tcmp2: {
        operational: despesas.filter(l => l.categoria === "operacional").reduce((s, l) => s + l.valor, 0),
        people: despesas.filter(l => l.categoria === "pessoas" && l.subcategoria !== "Pró-labore sócios").reduce((s, l) => s + l.valor, 0),
        prolabore: despesas.filter(l => l.subcategoria === "Pró-labore sócios").reduce((s, l) => s + l.valor, 0),
        marketing: despesas.filter(l => l.categoria === "marketing").reduce((s, l) => s + l.valor, 0),
        maintenance: despesas.filter(l => l.categoria === "manutencao").reduce((s, l) => s + l.valor, 0),
        third_party: despesas.filter(l => l.categoria === "terceirizados").reduce((s, l) => s + l.valor, 0),
        administrative: despesas.filter(l => l.categoria === "administrativo").reduce((s, l) => s + l.valor, 0),
      },
      costs_not_tcmp2: {
        financing: despesas.filter(l => l.categoria === "financeiro" && l.subcategoria === "Financiamento (veículo/imóvel)").reduce((s, l) => s + l.valor, 0),
        consortium: despesas.filter(l => l.subcategoria === "Consórcio").reduce((s, l) => s + l.valor, 0),
        equipment_installments: despesas.filter(l => l.subcategoria === "Parcelamento de equipamento").reduce((s, l) => s + l.valor, 0),
        // parts_invoices NOT mapped here — lives in parts_cost to avoid double-counting
        parts_invoices: 0,
        legal_processes: despesas.filter(l => l.subcategoria === "Processos judiciais").reduce((s, l) => s + l.valor, 0),
        land_purchase: despesas.filter(l => l.subcategoria === "Compra de imóvel/terreno").reduce((s, l) => s + l.valor, 0),
        investments: despesas.filter(l => l.categoria === "financeiro" && !["Financiamento (veículo/imóvel)", "Consórcio", "Parcelamento de equipamento", "Processos judiciais", "Compra de imóvel/terreno"].includes(l.subcategoria)).reduce((s, l) => s + l.valor, 0),
      },
      parts_cost: {
        parts_applied_cost: 0, // não lançado aqui — usuário preenche manualmente na aba Peças
        parts_stock_purchase: despesas.filter(l => l.categoria === "pecas_estoque").reduce((s, l) => s + l.valor, 0),
      }
    };
  }, [lancamentos]);

  // Agrupar por categoria
  const grupos = useMemo(() => {
    const filtrados = abaAtiva === "receitas"
      ? lancamentos.filter(l => l.tipo === "receita")
      : abaAtiva === "despesas"
        ? lancamentos.filter(l => l.tipo === "despesa")
        : lancamentos;

    return filtrados.reduce((acc, item) => {
      const key = item.tipo + "_" + item.categoria;
      if (!acc[key]) {
        const cats = item.tipo === "receita" ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA;
        acc[key] = { label: cats[item.categoria]?.label ?? item.categoria, tipo: item.tipo, itens: [], catKey: item.categoria };
      }
      acc[key].itens.push(item);
      return acc;
    }, {});
  }, [lancamentos, abaAtiva]);

  const totalReceitas = lancamentos.filter(l => l.tipo === "receita").reduce((s, l) => s + l.valor, 0);
  const totalDespesas = lancamentos.filter(l => l.tipo === "despesa").reduce((s, l) => s + l.valor, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Banner explicativo */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-3">
        <BarChart3 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-800">
          <strong>Modo Avançado:</strong> Lance cada receita e despesa individualmente. O sistema classifica automaticamente se entra no TCMP² e calcula sua margem. Ao finalizar, clique em <strong>"Consolidar no DRE"</strong> para aplicar os totais.
        </p>
      </div>

      {/* Filtro de Período */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <FiltroPeriodo
          mes={mesAtual}
          ano={anoAtual}
          periodo={periodo}
          onMesChange={(novoMes) => {
            const novaData = `${anoAtual}-${novoMes}`;
            window.dispatchEvent(new CustomEvent('dre-mudar-mes', { detail: { mes: novaData } }));
          }}
          onAnoChange={(novoAno) => setAno(parseInt(novoAno))}
          onPeriodoChange={(novoPeriodo) => setPeriodo(novoPeriodo)}
        />
      </div>

      {/* VISÃO ANUAL */}
      {periodo === "anual" ? (
        <div className="space-y-6">
          {isLoadingAnual ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : dadosAnuais ? (
            <>
              {/* KPIs Anuais */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs opacity-75">Receita Total Anual</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{formatCurrency(dadosAnuais.total_anual.receitas)}</p>
                    <p className="text-xs opacity-80 mt-1">Média mensal: {formatCurrency(dadosAnuais.media_mensal.receitas)}</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs opacity-75">Despesas Totais</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{formatCurrency(dadosAnuais.total_anual.despesas)}</p>
                    <p className="text-xs opacity-80 mt-1">Média mensal: {formatCurrency(dadosAnuais.media_mensal.despesas)}</p>
                  </CardContent>
                </Card>

                <Card className={`bg-gradient-to-br ${dadosAnuais.total_anual.lucro >= 0 ? "from-emerald-500 to-teal-600" : "from-red-500 to-rose-600"} text-white`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs opacity-75">Lucro Anual</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{formatCurrency(dadosAnuais.total_anual.lucro)}</p>
                    <p className="text-xs opacity-80 mt-1">Margem: {dadosAnuais.total_anual.margem.toFixed(1)}%</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs opacity-75">Total Lançamentos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{dadosAnuais.total_lancamentos}</p>
                    <p className="text-xs opacity-80 mt-1">em {dadosAnuais.meses.filter(m => m.receitas > 0 || m.despesas > 0).length} meses</p>
                  </CardContent>
                </Card>
              </div>

              {/* Gráfico Mensal */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">📊 Evolução Mensal - {ano}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dadosAnuais.meses}>
                        <XAxis dataKey="mes_nome" tick={{ fontSize: 11 }} />
                        <YAxis tickFormatter={(v) => `R$ ${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                        <Tooltip 
                          formatter={(value) => formatCurrency(value)}
                          contentStyle={{ fontSize: '12px' }}
                        />
                        <Legend />
                        <Bar dataKey="receitas" name="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="despesas" name="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="lucro" name="Lucro" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Tabela por Categoria */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">📋 Totais por Categoria - {ano}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {dadosAnuais.categorias.map((cat) => (
                      <div key={cat.categoria} className="flex items-center justify-between py-2 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={cat.tipo === "receita" ? "border-green-300 text-green-700" : "border-red-300 text-red-700"}>
                            {cat.tipo === "receita" ? "💰" : "📉"} {cat.label}
                          </Badge>
                          {!cat.entra_tcmp2 && cat.tipo === "despesa" && (
                            <span className="text-xs text-orange-600">🚫 Fora TCMP²</span>
                          )}
                        </div>
                        <span className={`font-bold ${cat.tipo === "receita" ? "text-green-700" : "text-red-700"}`}>
                          {cat.tipo === "receita" ? "+" : "-"} {formatCurrency(cat.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      ) : (
        /* VISÃO MENSAL (EXISTENTE) */
        <div className="space-y-4">
          {/* Sub-abas internas */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {[
              { key: "todos", label: "📋 Todos" },
              { key: "receitas", label: "💰 Receitas (" + formatCurrency(totalReceitas) + ")" },
              { key: "despesas", label: "📉 Despesas (" + formatCurrency(totalDespesas) + ")" },
              { key: "analise", label: "📊 Análise" }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setAbaAtiva(tab.key)}
                className={"flex-1 text-xs py-1.5 px-2 rounded-md transition-all font-medium " + (abaAtiva === tab.key ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700")}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Aba de Análise */}
          {abaAtiva === "analise" ? (
            <PainelAnalise lancamentos={lancamentos} tecnicosCount={tecnicosCount} horasMes={horasMes} />
          ) : (
            <>
              {/* Botões de ação */}
              <div className="flex items-center gap-2 flex-wrap">
                {(abaAtiva === "todos" || abaAtiva === "receitas") && (
                  <Button size="sm" variant="outline" className="border-green-300 text-green-700 hover:bg-green-50"
                    onClick={() => setShowForm(showForm === "receita" ? null : "receita")}>
                    <ArrowUpCircle className="w-4 h-4 mr-1" /> + Receita
                  </Button>
                )}
                {(abaAtiva === "todos" || abaAtiva === "despesas") && (
                  <Button size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-50"
                    onClick={() => setShowForm(showForm === "despesa" ? null : "despesa")}>
                    <ArrowDownCircle className="w-4 h-4 mr-1" /> + Despesa
                  </Button>
                )}
                <div className="ml-auto flex gap-2">
                  <Button size="sm" variant="outline" onClick={refresh}>
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                  {lancamentos.length > 0 && onConsolidar && (
                    <Button size="sm" className="bg-green-600 hover:bg-green-700"
                      onClick={() => onConsolidar(totaisConsolidados)}>
                      <TrendingUp className="w-4 h-4 mr-1" /> Consolidar no DRE
                    </Button>
                  )}
                </div>
              </div>

              {/* Formulário */}
              {showForm && (
                <FormLancamento
                  tipo={showForm}
                  workshopId={workshopId}
                  mes={mes}
                  onSuccess={() => { refresh(); setShowForm(null); }}
                  onCancel={() => setShowForm(null)}
                />
              )}

              {/* Lista de lançamentos */}
              {Object.keys(grupos).length === 0 ? (
                <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                  <Plus className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhum lançamento ainda.</p>
                  <p className="text-xs">Clique em "+ Receita" ou "+ Despesa" para começar.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(grupos).map(([key, grupo]) => (
                    <GrupoCategoria
                      key={key}
                      catKey={grupo.catKey}
                      label={grupo.label}
                      itens={grupo.itens}
                      tipo={grupo.tipo}
                      onDelete={refresh}
                      onSaved={refresh}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* Legenda TCMP² */}
          {abaAtiva !== "analise" && lancamentos.some(l => l.tipo === "despesa") && (
            <div className="flex gap-4 text-xs text-gray-500 pt-2 border-t border-gray-100">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block" /> Entra no TCMP²</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" /> Fora do TCMP²</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block" /> Receita</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}