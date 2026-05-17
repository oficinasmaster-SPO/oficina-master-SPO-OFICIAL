import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputMoeda } from "@/components/ui/InputMoeda";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit2, Trash2, Loader2, AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";
import { formatCurrency, formatNumber } from "../utils/formatters";
import { toast } from "sonner";
import BudgetSummaryCards from "./BudgetSummaryCards";
import BudgetProgressBars from "./BudgetProgressBars";
import BudgetVariationReport from "./BudgetVariationReport";
import BudgetConsolidatedReport from "./BudgetConsolidatedReport";
import BudgetHistoryTable from "./BudgetHistoryTable";
import BudgetResponsibilityMatrix from "./BudgetResponsibilityMatrix";
import BudgetDREResumoCard from "./BudgetDREResumoCard";

const CATEGORIAS = ["operacional", "pessoas", "marketing", "manutencao", "terceirizados", "administrativo", "financeiro", "pecas"];

const ITEMS_PADRAO = {
  operacional: ["Aluguel", "Energia", "Água", "Telefone"],
  pessoas: ["Salários", "Encargos", "Benefícios"],
  marketing: ["Publicidade", "Eventos", "Material"],
  manutencao: ["Manutenção Predial", "Manutenção Equipamentos"],
  terceirizados: ["Contabilidade", "Advocacia", "Limpeza"],
  administrativo: ["Material Escritório", "Software", "Seguros"],
  financeiro: ["Juros", "Multas", "Taxas Bancárias"],
  pecas: ["Compra Peças"]
};

export default function BudgetMetaTab({ workshopId, mes, onMetasLoaded }) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [syncPulse, setSyncPulse] = useState(false); // feedback visual de sync
  const [formData, setFormData] = useState({
    faturamento_meta_rs: 0,
    item: "",
    categoria: "operacional",
    meta_percentual: 0,
    meta_fixa_rs: 0,
    responsavel_nome: "",
    notas: ""
  });

  // Buscar metas do mês
  const { data: metas = [], isLoading: isLoadingMetas } = useQuery({
    queryKey: ["budget-metas", workshopId, mes],
    queryFn: async () => {
      if (!workshopId) return [];
      const result = await base44.entities.BudgetMeta.filter({
        workshop_id: workshopId,
        mes: mes
      }, "-created_date");
      return Array.isArray(result) ? result : [];
    },
    enabled: !!workshopId && !!mes
  });

  // Buscar lançamentos do DRE para comparação
  const { data: lancamentos = [], refetch: refetchLancamentos } = useQuery({
    queryKey: ["dre-lancamentos", workshopId, mes],
    queryFn: async () => {
      if (!workshopId) return [];
      const result = await base44.entities.DRELancamento.filter({
        workshop_id: workshopId,
        mes: mes
      });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!workshopId && !!mes
  });

  // Real-time subscription: atualizar quando novo DRELancamento é criado
  useEffect(() => {
    if (!workshopId || !mes) return;

    // OPÇÃO 1: Real-time via BD subscription
    const unsubscribe = base44.entities.DRELancamento.subscribe((event) => {
      if (event.data?.workshop_id === workshopId && event.data?.mes === mes) {
        if (event.type === 'create' || event.type === 'delete') {
          setSyncPulse(true);
          refetchLancamentos();
          setTimeout(() => setSyncPulse(false), 1500);
        }
      }
    });

    // OPÇÃO 2: Event listener para sincronismo cross-tab (DRE Avançado → Controle Orçamentário)
    const handleDREChange = (e) => {
      if (e.detail?.workshop_id === workshopId && e.detail?.mes === mes) {
        setSyncPulse(true);
        refetchLancamentos();
        setTimeout(() => setSyncPulse(false), 1500);
      }
    };
    window.addEventListener('dre-lancamento-criado', handleDREChange);

    return () => {
      unsubscribe();
      window.removeEventListener('dre-lancamento-criado', handleDREChange);
    };
  }, [workshopId, mes, refetchLancamentos]);

  // Criar/Atualizar meta
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        workshop_id: workshopId,
        mes: mes,
        ...data
      };

      if (editingId) {
        return await base44.entities.BudgetMeta.update(editingId, payload);
      } else {
        return await base44.entities.BudgetMeta.create(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-metas", workshopId, mes] });
      toast.success(editingId ? "Meta atualizada!" : "Meta criada!");
      resetForm();
    },
    onError: () => {
      toast.error("Erro ao salvar meta");
    }
  });

  // Deletar meta
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.BudgetMeta.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-metas", workshopId, mes] });
      toast.success("Meta deletada!");
    },
    onError: () => {
      toast.error("Erro ao deletar meta");
    }
  });

  const resetForm = () => {
    setFormData({
      faturamento_meta_rs: 0,
      item: "",
      categoria: "operacional",
      meta_percentual: 0,
      meta_fixa_rs: 0,
      responsavel_nome: "",
      notas: ""
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (meta) => {
    setFormData({
      faturamento_meta_rs: meta.faturamento_meta_rs,
      item: meta.item,
      categoria: meta.categoria,
      meta_percentual: meta.meta_percentual || 0,
      meta_fixa_rs: meta.meta_fixa_rs || 0,
      responsavel_nome: meta.responsavel_nome || "",
      notas: meta.notas || ""
    });
    setEditingId(meta.id);
    setShowForm(true);
  };

  // Calcular totais e comparações
  const calculado = useMemo(() => {
    if (!metas.length) return { total_meta: 0, por_categoria: {} };

    const faturamento = metas[0]?.faturamento_meta_rs || 0;
    const por_categoria = {};
    let total_meta_rs = 0;

    metas.forEach(meta => {
      const meta_rs = meta.meta_percentual 
        ? (meta.meta_percentual / 100) * faturamento
        : meta.meta_fixa_rs;

      const realizado = lancamentos
        .filter(l => l.categoria === meta.categoria && l.item === meta.item)
        .reduce((sum, l) => sum + (l.valor || 0), 0);

      const diferenca = meta_rs - realizado;
      const variacao = meta_rs > 0 ? (diferenca / meta_rs) * 100 : 0;

      let status = "✅";
      if (realizado > meta_rs * 1.05) status = "❌";
      else if (realizado > meta_rs * 0.95) status = "⚠️";

      por_categoria[meta.id] = {
        meta_rs,
        realizado,
        diferenca,
        variacao,
        status
      };

      total_meta_rs += meta_rs;
    });

    return {
      total_meta: total_meta_rs,
      faturamento_meta: faturamento,
      por_categoria
    };
  }, [metas, lancamentos]);

  if (isLoadingMetas) {
    return <div className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Feedback de Sincronismo */}
      {syncPulse && (
        <div className="fixed top-4 right-4 z-50 animate-pulse bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          Dados do DRE atualizados instantaneamente
        </div>
      )}

      {/* Card: Todas despesas/receitas lançadas no DRE Avançado */}
      <BudgetDREResumoCard lancamentos={lancamentos} />

      {/* FASE 4: Relatório Consolidado */}
      {metas.length > 0 && (
        <BudgetConsolidatedReport calculado={calculado} metas={metas} />
      )}

      {/* FASE 4: Histórico de Variações */}
      <BudgetHistoryTable workshopId={workshopId} mes={mes} />

      {/* Cards Resumo */}
      <BudgetSummaryCards calculado={calculado} metas={metas} />

      {/* Progress Bars */}
      {metas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>📊 Progresso por Categoria</CardTitle>
            <CardDescription>Acompanhe o andamento de cada meta visualmente</CardDescription>
          </CardHeader>
          <CardContent>
            <BudgetProgressBars metas={metas} calculado={calculado} />
          </CardContent>
        </Card>
      )}

      {/* Relatório de Variações */}
      {metas.length > 0 && (
        <BudgetVariationReport metas={metas} calculado={calculado} />
      )}

      {/* FASE 4: Responsáveis & Ações */}
      {metas.length > 0 && (
        <BudgetResponsibilityMatrix metas={metas} calculado={calculado} />
      )}

      {/* Seção: Configurar Metas */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>⚙️ Configurar Metas do Mês</CardTitle>
              <CardDescription>Defina as metas por categoria para controlar o orçamento</CardDescription>
            </div>
            {!showForm && (
              <Button onClick={() => setShowForm(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Nova Meta
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {showForm && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Meta Total de Faturamento (R$)</Label>
                  <InputMoeda
                    value={formData.faturamento_meta_rs}
                    onChange={(e) => setFormData({ ...formData, faturamento_meta_rs: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Nome do Item</Label>
                  <Input
                    value={formData.item}
                    onChange={(e) => setFormData({ ...formData, item: e.target.value })}
                    placeholder="ex: Aluguel, Salários..."
                  />
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Select value={formData.categoria} onValueChange={(value) => setFormData({ ...formData, categoria: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Responsável</Label>
                  <Input
                    value={formData.responsavel_nome}
                    onChange={(e) => setFormData({ ...formData, responsavel_nome: e.target.value })}
                    placeholder="Nome do responsável"
                  />
                </div>
                <div>
                  <Label>Meta em % do Faturamento</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.meta_percentual}
                    onChange={(e) => setFormData({ ...formData, meta_percentual: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>OU Meta em R$ Fixo</Label>
                  <InputMoeda
                    value={formData.meta_fixa_rs}
                    onChange={(e) => setFormData({ ...formData, meta_fixa_rs: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div>
                <Label>Notas</Label>
                <Input
                  value={formData.notas}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  placeholder="Anotações sobre esta meta..."
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={resetForm}>Cancelar</Button>
                <Button 
                  onClick={() => saveMutation.mutate(formData)}
                  disabled={saveMutation.isPending || !formData.item}
                >
                  {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {editingId ? "Atualizar" : "Criar"} Meta
                </Button>
              </div>
            </div>
          )}

          {/* Lista de Metas */}
          <div className="space-y-3">
            {metas.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Nenhuma meta cadastrada para este mês.</p>
            ) : (
              metas.map(meta => {
                const calc = calculado.por_categoria[meta.id] || {};
                const meta_rs = meta.meta_percentual 
                  ? (meta.meta_percentual / 100) * (meta.faturamento_meta_rs || 0)
                  : meta.meta_fixa_rs;

                return (
                  <div key={meta.id} className="p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{meta.item}</h4>
                          <Badge>{meta.categoria}</Badge>
                          <span className="text-2xl">{calc.status}</span>
                        </div>
                        <p className="text-sm text-gray-600">{meta.responsavel_nome || "Sem responsável"}</p>
                        {meta.notas && <p className="text-xs text-gray-500 mt-1">📝 {meta.notas}</p>}
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-sm"><strong>Meta:</strong> {formatCurrency(meta_rs)}</p>
                        <p className="text-sm"><strong>Real:</strong> {formatCurrency(calc.realizado || 0)}</p>
                        <p className={`text-sm font-semibold ${calc.diferenca >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {calc.diferenca >= 0 ? '+' : ''}{formatCurrency(calc.diferenca || 0)}
                        </p>
                      </div>
                      <div className="flex gap-1 ml-4">
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(meta)}><Edit2 className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(meta.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Seção: Comparação Real vs Meta */}
      <Card>
        <CardHeader>
          <CardTitle>📊 Comparação: Real vs Meta</CardTitle>
          <CardDescription>Acompanhe o realizado versus as metas definidas</CardDescription>
        </CardHeader>
        <CardContent>
          {metas.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Configure as metas acima para visualizar as comparações.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Item</th>
                    <th className="text-right py-2">Meta %</th>
                    <th className="text-right py-2">Meta R$</th>
                    <th className="text-right py-2">Realizado</th>
                    <th className="text-right py-2">Diferença</th>
                    <th className="text-right py-2">Variação %</th>
                    <th className="text-center py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {metas.map(meta => {
                    const calc = calculado.por_categoria[meta.id] || {};
                    return (
                      <tr key={meta.id} className="border-b hover:bg-gray-50">
                        <td className="py-3">{meta.item}</td>
                        <td className="text-right">{meta.meta_percentual}%</td>
                        <td className="text-right">{formatCurrency(calc.meta_rs || 0)}</td>
                        <td className="text-right">{formatCurrency(calc.realizado || 0)}</td>
                        <td className={`text-right font-semibold ${calc.diferenca >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {calc.diferenca >= 0 ? '+' : ''}{formatCurrency(calc.diferenca || 0)}
                        </td>
                        <td className="text-right">{formatNumber(calc.variacao || 0, 1)}%</td>
                        <td className="text-center text-2xl">{calc.status}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}