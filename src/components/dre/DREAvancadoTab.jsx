import React, { useState, useMemo } from "react";
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
  const [saving, setSaving] = useState(false);

  const categorias = tipo === "receita" ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA;
  const catSelecionada = categorias[catKey];

  const handleSave = async () => {
    if (!catKey || !valor || !descricao) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    const valorNum = parseFloat(valor.replace(",", "."));
    if (isNaN(valorNum) || valorNum <= 0) {
      toast.error("Informe um valor válido");
      return;
    }

    setSaving(true);
    try {
      await base44.entities.DRELancamento.create({
        workshop_id: workshopId,
        mes,
        tipo,
        categoria: catKey,
        subcategoria: subcat || (catSelecionada?.subcategorias[0] ?? ""),
        descricao,
        valor: valorNum,
        entra_tcmp2: catSelecionada?.entra_tcmp2 ?? true
      });
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
          <label className="text-xs text-gray-500 mb-1 block">Subcategoria</label>
          <select
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
            value={subcat}
            onChange={e => setSubcat(e.target.value)}
            disabled={!catKey}
          >
            <option value="">Selecione...</option>
            {catSelecionada?.subcategorias.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
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

// ─── LINHA DE LANÇAMENTO ──────────────────────────────────────────────────────
function LancamentoRow({ item, onDelete }) {
  const [deleting, setDeleting] = useState(false);
  const categorias = item.tipo === "receita" ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA;
  const cat = categorias[item.categoria];

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await base44.entities.DRELancamento.delete(item.id);
      onDelete();
    } catch {
      toast.error("Erro ao excluir");
      setDeleting(false);
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-lg hover:border-gray-300 transition-colors group">
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
function GrupoCategoria({ catKey, label, itens, tipo, onDelete }) {
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
        <LancamentoRow key={item.id} item={item} onDelete={onDelete} />
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

  const lucro = totalReceita - totalTcmp2 - totalNaoTcmp2 - custoPecas;
  const margemLucro = totalReceita > 0 ? (lucro / totalReceita) * 100 : 0;
  const totalHoras = (tecnicosCount || 1) * (horasMes || 219);
  const tcmp2 = totalHoras > 0 ? totalTcmp2 / totalHoras : 0;
  const r70 = totalReceita > 0 ? ((totalReceita - custoPecas) / totalReceita) * 100 : 0;

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

      {/* Waterfall */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
        <p className="text-sm font-semibold text-gray-700 mb-3">Demonstrativo de Resultado</p>
        {[
          { label: "Receita Bruta", valor: totalReceita, cor: "text-green-700", sinal: "+" },
          { label: "(-) Custos Operacionais (TCMP²)", valor: totalTcmp2, cor: "text-blue-700", sinal: "-" },
          { label: "(-) Custos Financeiros / Invest.", valor: totalNaoTcmp2, cor: "text-orange-700", sinal: "-" },
          { label: "(-) Custo de Peças / Estoque", valor: custoPecas, cor: "text-purple-700", sinal: "-" },
        ].map((row, i) => (
          <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-gray-100 last:border-0">
            <span className="text-gray-600">{row.label}</span>
            <span className={`font-semibold ${row.cor}`}>{row.sinal} {formatCurrency(row.valor)}</span>
          </div>
        ))}
        <div className="flex items-center justify-between pt-2 border-t-2 border-gray-300">
          <span className="font-bold text-gray-800">= Lucro Líquido</span>
          <span className={`font-bold text-lg ${lucro >= 0 ? "text-emerald-700" : "text-red-700"}`}>
            {formatCurrency(lucro)} ({margemLucro.toFixed(1)}%)
          </span>
        </div>
      </div>

      {/* Mix Receita */}
      {totalReceita > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-500 mb-2">Mix de Receita</p>
          <div className="flex gap-0.5 h-5 rounded-full overflow-hidden">
            <div className="bg-green-500 transition-all" style={{ width: `${(receitaPecas / totalReceita) * 100}%` }} />
            <div className="bg-emerald-400 transition-all" style={{ width: `${(receitaServicos / totalReceita) * 100}%` }} />
            <div className="bg-cyan-400 transition-all" style={{ width: `${((totalReceita - receitaPecas - receitaServicos) / totalReceita) * 100}%` }} />
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

  const { data: lancamentos = [], isLoading } = useQuery({
    queryKey: ["dre-lancamentos", workshopId, mes],
    queryFn: () => base44.entities.DRELancamento.filter({ workshop_id: workshopId, mes }, "created_date", 200),
    enabled: !!workshopId && !!mes
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["dre-lancamentos", workshopId, mes] });

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
      const key = `${item.tipo}_${item.categoria}`;
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

      {/* Sub-abas internas */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {[
          { key: "todos", label: "📋 Todos" },
          { key: "receitas", label: `💰 Receitas (${formatCurrency(totalReceitas)})` },
          { key: "despesas", label: `📉 Despesas (${formatCurrency(totalDespesas)})` },
          { key: "analise", label: "📊 Análise" }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setAbaAtiva(tab.key)}
            className={`flex-1 text-xs py-1.5 px-2 rounded-md transition-all font-medium ${abaAtiva === tab.key ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
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
  );
}