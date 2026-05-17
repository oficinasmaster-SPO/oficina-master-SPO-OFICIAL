import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign, TrendingUp, TrendingDown, Plus, Trash2,
  ChevronRight, CheckCircle, AlertCircle, Zap, BarChart3,
  ShoppingCart, Wrench, Users, Building2, Megaphone,
  Settings, CreditCard, Package, ArrowUpCircle, ArrowDownCircle,
  Info
} from "lucide-react";

// ─── CATEGORIAS DE DESPESAS ───────────────────────────────────────────────────
const CATEGORIAS_DESPESA = {
  operacional: {
    label: "Operacional",
    cor: "blue",
    icon: Building2,
    entram_tcmp2: true,
    subcategorias: ["Aluguel", "Energia elétrica", "Água e esgoto", "Telefone / Internet", "IPTU", "Seguro predial"]
  },
  pessoas: {
    label: "Pessoas",
    cor: "purple",
    icon: Users,
    entram_tcmp2: true,
    subcategorias: ["Salários", "FGTS", "INSS", "Vale transporte", "Vale refeição", "Férias / 13º (provisão)", "Pró-labore sócios"]
  },
  marketing: {
    label: "Marketing",
    cor: "pink",
    icon: Megaphone,
    entram_tcmp2: true,
    subcategorias: ["Tráfego pago (Meta/Google)", "Agência", "Material gráfico", "Patrocínios", "Uniforme / Branding"]
  },
  manutencao: {
    label: "Manutenção",
    cor: "orange",
    icon: Wrench,
    entram_tcmp2: true,
    subcategorias: ["Manutenção predial", "Manutenção de equipamentos", "Ferramentas", "EPI"]
  },
  terceirizados: {
    label: "Serviços Terceiros",
    cor: "teal",
    icon: Settings,
    entram_tcmp2: true,
    subcategorias: ["Contabilidade", "Advocacia", "Consultoria", "TI / Software", "Limpeza / Segurança"]
  },
  administrativo: {
    label: "Administrativo",
    cor: "gray",
    icon: BarChart3,
    entram_tcmp2: true,
    subcategorias: ["Material de escritório", "Taxas bancárias", "Impostos sobre serviço", "Certificações", "Seguros gerais"]
  },
  financeiro: {
    label: "Financeiro / Investimento",
    cor: "red",
    icon: CreditCard,
    entram_tcmp2: false,
    subcategorias: ["Financiamento (veículo/imóvel)", "Consórcio", "Parcelamento de equipamento", "Empréstimo bancário", "Processos judiciais", "Compra de imóvel/terreno"]
  },
  pecas_estoque: {
    label: "Peças para Estoque",
    cor: "yellow",
    icon: Package,
    entram_tcmp2: false,
    subcategorias: ["Boleto de peças (estoque)", "Compra antecipada", "Devolução"]
  }
};

const CATEGORIAS_RECEITA = {
  pecas_aplicadas: {
    label: "Peças Aplicadas",
    cor: "green",
    icon: Package,
    subcategorias: ["Peças mecânicas", "Peças elétricas", "Funilaria / Pintura", "Pneus / Rodas", "Acessórios"]
  },
  servicos: {
    label: "Serviços (Mão de Obra)",
    cor: "emerald",
    icon: Wrench,
    subcategorias: ["Revisão / Manutenção", "Funilaria", "Pintura", "Alinhamento / Balanceamento", "Elétrica / Scanner", "Vidros / Insulfilm"]
  },
  outras: {
    label: "Outras Receitas",
    cor: "cyan",
    icon: DollarSign,
    subcategorias: ["Venda de sucata", "Locadora / Seguradora", "Franquia / Repasse", "Outros"]
  }
};

// ─── COMPONENTE: BADGE DE CATEGORIA ──────────────────────────────────────────
const CatBadge = ({ entram_tcmp2 }) => entram_tcmp2
  ? <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">✅ Entra TCMP²</span>
  : <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">🚫 Fora TCMP²</span>;

// ─── COMPONENTE: LINHA DE LANÇAMENTO ─────────────────────────────────────────
const LancamentoRow = ({ item, onRemove }) => (
  <div className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-lg hover:border-gray-300 transition-colors group">
    <div className={`w-2 h-8 rounded-full ${item.tipo === 'receita' ? 'bg-green-400' : item.entram_tcmp2 ? 'bg-blue-400' : 'bg-red-400'}`} />
    <div className="flex-1">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-900">{item.descricao}</span>
        <span className="text-xs text-gray-400">· {item.subcategoria}</span>
      </div>
      <div className="flex items-center gap-2 mt-0.5">
        <span className="text-xs text-gray-500">{item.categoria}</span>
        {item.tipo === 'despesa' && <CatBadge entram_tcmp2={item.entram_tcmp2} />}
      </div>
    </div>
    <div className={`font-bold text-sm ${item.tipo === 'receita' ? 'text-green-600' : 'text-red-600'}`}>
      {item.tipo === 'receita' ? '+' : '-'} R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
    </div>
    <button onClick={() => onRemove(item.id)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all">
      <Trash2 className="w-4 h-4" />
    </button>
  </div>
);

// ─── COMPONENTE: FORMULÁRIO DE LANÇAMENTO ────────────────────────────────────
const FormLancamento = ({ tipo, onAdd, onClose }) => {
  const [catKey, setCatKey] = useState('');
  const [subcat, setSubcat] = useState('');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');

  const categorias = tipo === 'receita' ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA;
  const catSelecionada = categorias[catKey];

  const handleAdd = () => {
    if (!catKey || !valor || !descricao) return;
    onAdd({
      id: Date.now(),
      tipo,
      categoria: catSelecionada.label,
      catKey,
      subcategoria: subcat || catSelecionada.subcategorias[0],
      descricao,
      valor: parseFloat(valor.replace(',', '.')) || 0,
      entram_tcmp2: catSelecionada.entram_tcmp2 ?? true
    });
    setCatKey(''); setSubcat(''); setDescricao(''); setValor('');
    onClose();
  };

  return (
    <div className="bg-gradient-to-br from-slate-50 to-blue-50 border-2 border-dashed border-blue-200 rounded-xl p-4 space-y-3">
      <p className="text-sm font-semibold text-blue-700">
        {tipo === 'receita' ? '💰 Novo Lançamento de Receita' : '📋 Novo Lançamento de Despesa'}
      </p>

      {/* Categoria */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Categoria *</label>
          <select
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
            value={catKey}
            onChange={e => { setCatKey(e.target.value); setSubcat(''); }}
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
      {catKey && tipo === 'despesa' && (
        <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${catSelecionada?.entram_tcmp2 ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>
          {catSelecionada?.entram_tcmp2
            ? <><CheckCircle className="w-3 h-3" /> Este custo <strong>ENTRA</strong> no cálculo do TCMP²</>
            : <><AlertCircle className="w-3 h-3" /> Este custo <strong>NÃO ENTRA</strong> no cálculo do TCMP²</>
          }
        </div>
      )}

      {/* Descrição + Valor */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Descrição *</label>
          <input
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
            placeholder="Ex: Energia elétrica março"
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
        <Button size="sm" onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 flex-1">
          <Plus className="w-4 h-4 mr-1" /> Adicionar Lançamento
        </Button>
        <Button size="sm" variant="outline" onClick={onClose}>Cancelar</Button>
      </div>
    </div>
  );
};

// ─── COMPONENTE: CARD KPI ─────────────────────────────────────────────────────
const KpiCard = ({ label, valor, sub, color, icon: Icon, alerta }) => (
  <div className={`rounded-xl p-4 text-white bg-gradient-to-br ${color}`}>
    <div className="flex items-center justify-between mb-1">
      <span className="text-xs opacity-80">{label}</span>
      <Icon className="w-5 h-5 opacity-70" />
    </div>
    <p className="text-2xl font-bold">{valor}</p>
    {sub && <p className="text-xs opacity-70 mt-1">{sub}</p>}
    {alerta && <p className="text-xs mt-1 bg-white/20 rounded px-2 py-0.5">{alerta}</p>}
  </div>
);

// ─── COMPONENTE: ABA LANCAMENTOS ─────────────────────────────────────────────
const AbaLancamentos = ({ lancamentos, onAdd, onRemove, tipoFiltro }) => {
  const [showForm, setShowForm] = useState(null); // 'receita' | 'despesa' | null

  const filtrados = tipoFiltro
    ? lancamentos.filter(l => l.tipo === tipoFiltro)
    : lancamentos;

  const grupos = filtrados.reduce((acc, item) => {
    const key = item.catKey;
    if (!acc[key]) acc[key] = { label: item.categoria, itens: [], total: 0 };
    acc[key].itens.push(item);
    acc[key].total += item.valor;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Botões de adicionar */}
      <div className="flex gap-2">
        {(!tipoFiltro || tipoFiltro === 'receita') && (
          <Button size="sm" variant="outline" className="border-green-300 text-green-700 hover:bg-green-50" onClick={() => setShowForm(showForm === 'receita' ? null : 'receita')}>
            <ArrowUpCircle className="w-4 h-4 mr-1" /> + Receita
          </Button>
        )}
        {(!tipoFiltro || tipoFiltro === 'despesa') && (
          <Button size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-50" onClick={() => setShowForm(showForm === 'despesa' ? null : 'despesa')}>
            <ArrowDownCircle className="w-4 h-4 mr-1" /> + Despesa
          </Button>
        )}
      </div>

      {/* Formulário */}
      {showForm && (
        <FormLancamento tipo={showForm} onAdd={onAdd} onClose={() => setShowForm(null)} />
      )}

      {/* Lista agrupada por categoria */}
      {Object.entries(grupos).length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Plus className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhum lançamento ainda.</p>
          <p className="text-xs">Clique em "+ Receita" ou "+ Despesa" para começar.</p>
        </div>
      ) : (
        Object.entries(grupos).map(([key, grupo]) => (
          <div key={key} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{grupo.label}</span>
              <span className="text-xs font-bold text-gray-700">
                R$ {grupo.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            {grupo.itens.map(item => (
              <LancamentoRow key={item.id} item={item} onRemove={onRemove} />
            ))}
          </div>
        ))
      )}
    </div>
  );
};

// ─── COMPONENTE: RESUMO ANÁLISE MARGEM ───────────────────────────────────────
const ResumoAnalise = ({ lancamentos }) => {
  const receitas = lancamentos.filter(l => l.tipo === 'receita');
  const despesas = lancamentos.filter(l => l.tipo === 'despesa');

  const totalReceita = receitas.reduce((s, l) => s + l.valor, 0);
  const totalTcmp2 = despesas.filter(l => l.entram_tcmp2).reduce((s, l) => s + l.valor, 0);
  const totalNaoTcmp2 = despesas.filter(l => !l.entram_tcmp2).reduce((s, l) => s + l.valor, 0);
  const custosPecas = despesas.filter(l => l.catKey === 'pecas_estoque').reduce((s, l) => s + l.valor, 0);

  const receitaPecas = receitas.filter(l => l.catKey === 'pecas_aplicadas').reduce((s, l) => s + l.valor, 0);
  const receitaServicos = receitas.filter(l => l.catKey === 'servicos').reduce((s, l) => s + l.valor, 0);

  const lucro = totalReceita - totalTcmp2 - totalNaoTcmp2 - custosPecas;
  const margemLucro = totalReceita > 0 ? (lucro / totalReceita) * 100 : 0;

  const r70 = totalReceita > 0 ? ((totalReceita - custosPecas) / totalReceita) * 100 : 0;
  const i30 = 100 - r70;

  const tcmp2 = 3 * 219 > 0 ? totalTcmp2 / (3 * 219) : 0; // mock: 3 técnicos × 219h

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Receita Total" valor={`R$ ${(totalReceita/1000).toFixed(1)}k`} color="from-green-500 to-emerald-600" icon={TrendingUp} />
        <KpiCard label="TCMP² / hora" valor={`R$ ${tcmp2.toFixed(2)}`} sub="3 técnicos × 219h" color="from-blue-500 to-indigo-600" icon={BarChart3} />
        <KpiCard
          label="R70 / I30"
          valor={`${r70.toFixed(0)}% / ${i30.toFixed(0)}%`}
          color={r70 >= 70 ? "from-purple-500 to-pink-600" : "from-orange-500 to-red-600"}
          icon={r70 >= 70 ? CheckCircle : AlertCircle}
          alerta={r70 < 70 ? "⚠️ Abaixo da meta 70%" : "✅ Meta atingida"}
        />
        <KpiCard
          label="Lucro Estimado"
          valor={`R$ ${(lucro/1000).toFixed(1)}k`}
          sub={`${margemLucro.toFixed(1)}% de margem`}
          color={lucro >= 0 ? "from-emerald-500 to-teal-600" : "from-red-500 to-rose-600"}
          icon={lucro >= 0 ? TrendingUp : TrendingDown}
        />
      </div>

      {/* Análise de Margem Detalhada */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            Análise de Margem
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Waterfall visual simples */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded bg-green-500" />
              <span className="flex-1 text-gray-600">Receita Bruta</span>
              <span className="font-bold text-green-700">+ R$ {totalReceita.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded bg-blue-400" />
              <span className="flex-1 text-gray-600">(-) Custos Operacionais (TCMP²)</span>
              <span className="font-semibold text-blue-700">- R$ {totalTcmp2.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded bg-orange-400" />
              <span className="flex-1 text-gray-600">(-) Custos Financeiros / Investimentos</span>
              <span className="font-semibold text-orange-700">- R$ {totalNaoTcmp2.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded bg-purple-400" />
              <span className="flex-1 text-gray-600">(-) Custo de Peças</span>
              <span className="font-semibold text-purple-700">- R$ {custosPecas.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
            </div>
            <div className="h-px bg-gray-200 my-2" />
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded ${lucro >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <span className="flex-1 font-bold text-gray-800">= Lucro Líquido</span>
              <span className={`font-bold text-lg ${lucro >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                R$ {lucro.toLocaleString('pt-BR', {minimumFractionDigits: 2})} ({margemLucro.toFixed(1)}%)
              </span>
            </div>
          </div>

          {/* Mix Receita */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs font-semibold text-gray-600 mb-2">Mix de Receita</p>
            <div className="flex gap-1 h-4 rounded-full overflow-hidden">
              {totalReceita > 0 && <>
                <div className="bg-green-500" style={{ width: `${(receitaPecas / totalReceita) * 100}%` }} title="Peças" />
                <div className="bg-emerald-400" style={{ width: `${(receitaServicos / totalReceita) * 100}%` }} title="Serviços" />
                <div className="bg-cyan-400" style={{ width: `${((totalReceita - receitaPecas - receitaServicos) / totalReceita) * 100}%` }} title="Outros" />
              </>}
              {totalReceita === 0 && <div className="bg-gray-200 w-full" />}
            </div>
            <div className="flex gap-4 mt-1.5 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-green-500 inline-block" /> Peças: {totalReceita > 0 ? ((receitaPecas/totalReceita)*100).toFixed(0) : 0}%</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-400 inline-block" /> Serviços: {totalReceita > 0 ? ((receitaServicos/totalReceita)*100).toFixed(0) : 0}%</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-cyan-400 inline-block" /> Outros: {totalReceita > 0 ? (((totalReceita - receitaPecas - receitaServicos)/totalReceita)*100).toFixed(0) : 0}%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ─── PÁGINA PRINCIPAL (MOCKUP) ────────────────────────────────────────────────
export default function DreMockup() {
  const [lancamentos, setLancamentos] = useState([
    { id: 1, tipo: 'receita', categoria: 'Peças Aplicadas', catKey: 'pecas_aplicadas', subcategoria: 'Peças mecânicas', descricao: 'Peças mecânicas março', valor: 28000, entram_tcmp2: true },
    { id: 2, tipo: 'receita', categoria: 'Serviços (Mão de Obra)', catKey: 'servicos', subcategoria: 'Revisão / Manutenção', descricao: 'Serviços gerais março', valor: 42000, entram_tcmp2: true },
    { id: 3, tipo: 'despesa', categoria: 'Operacional', catKey: 'operacional', subcategoria: 'Aluguel', descricao: 'Aluguel março', valor: 4500, entram_tcmp2: true },
    { id: 4, tipo: 'despesa', categoria: 'Pessoas', catKey: 'pessoas', subcategoria: 'Salários', descricao: 'Folha de pagamento', valor: 18000, entram_tcmp2: true },
    { id: 5, tipo: 'despesa', categoria: 'Marketing', catKey: 'marketing', subcategoria: 'Tráfego pago (Meta/Google)', descricao: 'Meta Ads março', valor: 2000, entram_tcmp2: true },
    { id: 6, tipo: 'despesa', categoria: 'Financeiro / Investimento', catKey: 'financeiro', subcategoria: 'Financiamento (veículo/imóvel)', descricao: 'Financiamento lifter', valor: 1800, entram_tcmp2: false },
    { id: 7, tipo: 'despesa', categoria: 'Peças para Estoque', catKey: 'pecas_estoque', subcategoria: 'Boleto de peças (estoque)', descricao: 'Boleto Auto Peças Brasil', valor: 8000, entram_tcmp2: false },
  ]);

  const addLancamento = (item) => setLancamentos(prev => [...prev, item]);
  const removeLancamento = (id) => setLancamentos(prev => prev.filter(l => l.id !== id));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">🎨 MOCKUP — Visual para validação</Badge>
              <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs">Modo Avançado</Badge>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">DRE Avançado — Lançamentos Detalhados</h1>
            <p className="text-sm text-gray-500">Para oficinas sem sistema de gestão financeiro · Maio 2026</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Modo de entrada</p>
            <div className="flex items-center gap-1 mt-1">
              <button className="text-xs px-3 py-1 rounded-l-lg border bg-white text-gray-500">Resumido (ERP)</button>
              <button className="text-xs px-3 py-1 rounded-r-lg border border-blue-500 bg-blue-600 text-white font-semibold">Avançado ✓</button>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-3">
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800">
            <strong>Como funciona:</strong> Lance cada receita e despesa individualmente. O sistema classifica automaticamente se entra ou não no TCMP²,
            calcula sua margem e gera o DRE completo no final do mês. Ideal para quem não tem ERP ou sistema financeiro.
          </p>
        </div>

        {/* Abas */}
        <Tabs defaultValue="todos">
          <TabsList className="bg-white shadow-sm border">
            <TabsTrigger value="todos">📋 Todos os Lançamentos</TabsTrigger>
            <TabsTrigger value="receitas">💰 Receitas</TabsTrigger>
            <TabsTrigger value="despesas">📉 Despesas</TabsTrigger>
            <TabsTrigger value="analise">📊 Análise de Margem</TabsTrigger>
          </TabsList>

          <div className="mt-4">
            <TabsContent value="todos">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Todos os Lançamentos do Mês</CardTitle>
                </CardHeader>
                <CardContent>
                  <AbaLancamentos lancamentos={lancamentos} onAdd={addLancamento} onRemove={removeLancamento} tipoFiltro={null} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="receitas">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ArrowUpCircle className="w-4 h-4 text-green-600" /> Receitas do Mês
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <AbaLancamentos lancamentos={lancamentos} onAdd={addLancamento} onRemove={removeLancamento} tipoFiltro="receita" />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="despesas">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ArrowDownCircle className="w-4 h-4 text-red-600" /> Despesas do Mês
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Legenda */}
                  <div className="flex gap-3 mb-4 text-xs">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-400 inline-block" /> Entra no TCMP²</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-400 inline-block" /> Fora do TCMP²</span>
                  </div>
                  <AbaLancamentos lancamentos={lancamentos} onAdd={addLancamento} onRemove={removeLancamento} tipoFiltro="despesa" />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analise">
              <ResumoAnalise lancamentos={lancamentos} />
            </TabsContent>
          </div>
        </Tabs>

        {/* Rodapé mockup */}
        <div className="text-center text-xs text-gray-400 pt-4 border-t border-gray-200">
          🎨 Este é um <strong>mockup visual</strong> para validação. Nenhum dado é salvo. Aprove o visual para implementarmos de verdade.
        </div>
      </div>
    </div>
  );
}