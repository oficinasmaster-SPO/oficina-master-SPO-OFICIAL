import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, TrendingDown, AlertTriangle, Download, Calculator, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function DiagnosticoEndividamento() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [importMonth, setImportMonth] = useState("");
  
  const [meses, setMeses] = useState(
    Array.from({ length: 12 }, (_, i) => ({
      mes: i + 1,
      pecas: 0,
      financiamento: 0,
      consorcio: 0,
      processos_judiciais: 0,
      investimento: 0,
      receita_prevista: 0,
      custo_previsto_pecas: 0,
      custo_previsto_administrativo: 0
    }))
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      const workshops = await base44.entities.Workshop.list();
      const userWorkshop = workshops.find(w => w.owner_id === currentUser.id);
      setWorkshop(userWorkshop);
    } catch (error) {
      toast.error("Você precisa estar logado");
      base44.auth.redirectToLogin(createPageUrl("DiagnosticoEndividamento"));
    } finally {
      setLoading(false);
    }
  };

  const { data: dreList = [] } = useQuery({
    queryKey: ['dre-list', workshop?.id],
    queryFn: async () => {
      if (!workshop?.id) return [];
      return await base44.entities.DREMonthly.filter({ workshop_id: workshop.id }, '-month', 12);
    },
    enabled: !!workshop?.id,
  });

  const handleImportDRE = () => {
    if (!importMonth) {
      toast.error("Selecione um mês para importar");
      return;
    }

    const dre = dreList.find(d => d.month === importMonth);
    if (!dre) {
      toast.error("Dados do DRE não encontrados para o mês selecionado");
      return;
    }

    // Calculate values from DRE
    const pecasEstoque = dre.parts_cost?.parts_stock_purchase || 0;
    const financiamento = dre.costs_not_tcmp2?.financing || 0;
    const consorcio = dre.costs_not_tcmp2?.consortium || 0;
    const processos = dre.costs_not_tcmp2?.legal_processes || 0;
    const investimento = (dre.costs_not_tcmp2?.investments || 0) + (dre.costs_not_tcmp2?.land_purchase || 0);
    
    const custoPecasAplicadas = dre.parts_cost?.parts_applied_cost || 0;
    
    const custoAdm = dre.calculated?.total_costs_tcmp2 || 
                     Object.values(dre.costs_tcmp2 || {}).reduce((a, b) => a + (parseFloat(b) || 0), 0);
    
    const receita = dre.calculated?.total_revenue || 
                    ((dre.revenue?.parts_applied || 0) + (dre.revenue?.services || 0) + (dre.revenue?.other || 0));

    // Update first 3 months as a projection base
    const newMeses = [...meses];
    for (let i = 0; i < 3; i++) {
      newMeses[i] = {
        ...newMeses[i],
        pecas: pecasEstoque,
        financiamento: financiamento,
        consorcio: consorcio,
        processos_judiciais: processos,
        investimento: investimento,
        custo_previsto_pecas: custoPecasAplicadas,
        custo_previsto_administrativo: custoAdm,
        receita_prevista: receita
      };
    }
    setMeses(newMeses);
    toast.success("Dados importados do DRE para os meses 1, 2 e 3!");
  };

  const updateMes = (index, field, value) => {
    const newMeses = [...meses];
    newMeses[index][field] = parseFloat(value) || 0;
    setMeses(newMeses);
  };

  const calculateMonthData = (mes) => {
    const dividas_total = mes.pecas + mes.financiamento + mes.consorcio + 
                          mes.processos_judiciais + mes.investimento;
    
    const comprometimento = mes.receita_prevista > 0 
      ? (dividas_total / mes.receita_prevista) * 100 
      : 0;

    let classificacao = "EXCELENTE";
    let recomendacao = "O endividamento está extremamente controlado. Continue operando dessa forma e mantendo reservas.";

    if (comprometimento > 80) {
      classificacao = "CRITICO";
      recomendacao = "Risco máximo de insolvência. Necessária intervenção imediata: renegociação, congelamento de dívidas e revisão emergencial de caixa.";
    } else if (comprometimento > 50) {
      classificacao = "ALERTA_VERMELHO";
      recomendacao = "Risco financeiro relevante. Revisar custos, aumentar a receita mínima e renegociar dívidas urgentemente.";
    } else if (comprometimento > 30) {
      classificacao = "ATENCAO";
      recomendacao = "Revisar despesas, renegociar prazos e otimizar processos para reduzir riscos futuros.";
    } else if (comprometimento > 10) {
      classificacao = "SAUDAVEL";
      recomendacao = "O nível de endividamento está dentro do aceitável. Monitorar caso ocorram quedas de receita.";
    }

    return {
      ...mes,
      dividas_total,
      comprometimento: Number(comprometimento.toFixed(2)),
      classificacao,
      recomendacao
    };
  };

  const generateProjections = (calculatedMeses) => {
    const projecoes = [];
    
    calculatedMeses.forEach((mes, index) => {
      // Cenário Otimista: -15% comprometimento
      projecoes.push({
        mes: mes.mes,
        cenario: "otimista",
        comprometimento_projetado: Math.max(0, mes.comprometimento * 0.85)
      });
      
      // Cenário Realista: mantém atual
      projecoes.push({
        mes: mes.mes,
        cenario: "realista",
        comprometimento_projetado: mes.comprometimento
      });
      
      // Cenário Pessimista: +20% comprometimento
      projecoes.push({
        mes: mes.mes,
        cenario: "pessimista",
        comprometimento_projetado: Math.min(100, mes.comprometimento * 1.20)
      });
    });
    
    return projecoes;
  };

  // Cálculos em tempo real para o Painel
  const mes1 = meses[0];
  const receitaAtual = mes1.receita_prevista || 0;
  const custosVariaveis = mes1.custo_previsto_pecas || 0;
  // Custos Fixos = Custos Adm + Total Dívidas (considerando dívidas como compromissos fixos no fluxo de caixa)
  const custosFixos = (mes1.custo_previsto_administrativo || 0) + 
                      (mes1.pecas + mes1.financiamento + mes1.consorcio + mes1.processos_judiciais + mes1.investimento);
  
  const margemContribuicao = receitaAtual - custosVariaveis;
  const indiceMargem = receitaAtual > 0 ? margemContribuicao / receitaAtual : 0;
  const pontoEquilibrio = indiceMargem > 0 ? custosFixos / indiceMargem : 0;
  const aumentoVendasNecessario = receitaAtual < pontoEquilibrio ? ((pontoEquilibrio - receitaAtual) / receitaAtual) * 100 : 0;

  // Projeção Caixa Líquido 3 meses
  const projecaoCaixa = meses.slice(0, 3).map(m => {
    const totalSaidas = (m.pecas + m.financiamento + m.consorcio + m.processos_judiciais + m.investimento) + 
                        (m.custo_previsto_pecas || 0) + 
                        (m.custo_previsto_administrativo || 0);
    return {
      mes: m.mes,
      caixa: m.receita_prevista - totalSaidas
    };
  });

  const handleSubmit = async () => {
    const hasInvalidData = meses.some(m => m.receita_prevista <= 0);
    if (hasInvalidData) {
      toast.error("Preencha a receita prevista para todos os meses");
      return;
    }

    setSubmitting(true);

    try {
      const calculatedMeses = meses.map(calculateMonthData);
      
      const endividamento_total_12m = calculatedMeses.reduce(
        (sum, m) => sum + m.dividas_total, 0
      );

      const custo_total_pecas_12m = calculatedMeses.reduce(
        (sum, m) => sum + (m.custo_previsto_pecas || 0), 0
      );

      const custo_total_administrativo_12m = calculatedMeses.reduce(
        (sum, m) => sum + (m.custo_previsto_administrativo || 0), 0
      );

      const comprometimentos = calculatedMeses.map(m => m.comprometimento);
      const maxComp = Math.max(...comprometimentos);
      const minComp = Math.min(...comprometimentos);
      const avgComp = comprometimentos.reduce((a, b) => a + b, 0) / 12;

      const mes_maior_comprometimento = calculatedMeses.findIndex(m => m.comprometimento === maxComp) + 1;
      const mes_menor_comprometimento = calculatedMeses.findIndex(m => m.comprometimento === minComp) + 1;

      let risco_anual = "EXCELENTE";
      if (avgComp > 80) risco_anual = "CRITICO";
      else if (avgComp > 50) risco_anual = "ALERTA_VERMELHO";
      else if (avgComp > 30) risco_anual = "ATENCAO";
      else if (avgComp > 10) risco_anual = "SAUDAVEL";

      const projecoes = generateProjections(calculatedMeses);

      // Gerar relatório IA
      const prompt = `
Você é um consultor financeiro da metodologia Oficinas Master. Analise o diagnóstico de endividamento abaixo:

RESUMO ANUAL:
- Endividamento total 12 meses: R$ ${endividamento_total_12m.toFixed(2)}
- Custo total com peças: R$ ${custo_total_pecas_12m.toFixed(2)}
- Custo administrativo/operacional: R$ ${custo_total_administrativo_12m.toFixed(2)}
- Média anual de comprometimento: ${avgComp.toFixed(2)}%
- Risco anual: ${risco_anual}
- Mês com maior comprometimento: Mês ${mes_maior_comprometimento} (${maxComp.toFixed(2)}%)
- Mês com menor comprometimento: Mês ${mes_menor_comprometimento} (${minComp.toFixed(2)}%)

DETALHAMENTO MENSAL:
${calculatedMeses.map(m => `
Mês ${m.mes}:
- Peças: R$ ${m.pecas.toFixed(2)}
- Financiamento: R$ ${m.financiamento.toFixed(2)}
- Consórcio: R$ ${m.consorcio.toFixed(2)}
- Processos Judiciais: R$ ${m.processos_judiciais.toFixed(2)}
- Investimento: R$ ${m.investimento.toFixed(2)}
- Custo Previsto Peças: R$ ${(m.custo_previsto_pecas || 0).toFixed(2)}
- Custo Administrativo: R$ ${(m.custo_previsto_administrativo || 0).toFixed(2)}
- Total Dívidas: R$ ${m.dividas_total.toFixed(2)}
- Receita Prevista: R$ ${m.receita_prevista.toFixed(2)}
- Comprometimento: ${m.comprometimento.toFixed(2)}%
- Classificação: ${m.classificacao}
`).join('\n')}

Gere um relatório executivo completo contendo:

1. DIAGNÓSTICO GERAL DA CURVA DE ENDIVIDAMENTO
2. ANÁLISE DOS CUSTOS PREVISTOS (Peças e Administrativo)
3. PONTOS DE ATENÇÃO E RISCOS FINANCEIROS
4. ANÁLISE DOS MESES CRÍTICOS E OPORTUNIDADES
5. PLANO DE AÇÃO DETALHADO E PRIORIZADO
6. INSIGHTS COMPORTAMENTAIS DA OPERAÇÃO
7. RECOMENDAÇÕES ESTRATÉGICAS COM FOCO EM FLUXO DE CAIXA

Seja específico, use linguagem clara e forneça ações práticas.
`;

      const relatorio_ia = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false
      });

      const analysis = await base44.entities.DebtAnalysis.create({
        workshop_id: workshop?.id || null,
        evaluator_id: user.id,
        meses: calculatedMeses,
        endividamento_total_12m: Number(endividamento_total_12m.toFixed(2)),
        custo_total_pecas_12m: Number(custo_total_pecas_12m.toFixed(2)),
        custo_total_administrativo_12m: Number(custo_total_administrativo_12m.toFixed(2)),
        mes_maior_comprometimento,
        mes_menor_comprometimento,
        media_anual_comprometimento: Number(avgComp.toFixed(2)),
        risco_anual,
        projecoes,
        relatorio_ia,
        ponto_equilibrio: Number(pontoEquilibrio.toFixed(2)),
        feedback_vendas_pct: Number(aumentoVendasNecessario.toFixed(2)),
        caixa_liquido_projetado: projecaoCaixa.map(p => ({ mes: p.mes, valor: Number(p.caixa.toFixed(2)) })),
        completed: true
      });

      toast.success("Análise de endividamento concluída!");
      navigate(createPageUrl("ResultadoEndividamento") + `?id=${analysis.id}`);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao processar análise");
    } finally {
      setSubmitting(false);
    }
  };

  const getClassificationColor = (comprometimento) => {
    if (comprometimento > 80) return "bg-red-500";
    if (comprometimento > 50) return "bg-orange-500";
    if (comprometimento > 30) return "bg-yellow-500";
    if (comprometimento > 10) return "bg-blue-500";
    return "bg-green-500";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <TrendingDown className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Diagnóstico de Endividamento
          </h1>
          <p className="text-lg text-gray-600">
            Análise Completa com Custos Previstos e Projeções
          </p>
        </div>

        {/* Painel de Simulação em Tempo Real */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white shadow-md border-l-4 border-blue-600">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calculator className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-700">Ponto de Equilíbrio (Mês 1)</h3>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pontoEquilibrio)}
              </div>
              <p className="text-xs text-gray-500">Receita necessária para cobrir custos + dívidas</p>
            </CardContent>
          </Card>

          <Card className={`bg-white shadow-md border-l-4 ${aumentoVendasNecessario > 0 ? 'border-red-500' : 'border-green-500'}`}>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${aumentoVendasNecessario > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                  <TrendingUp className={`w-5 h-5 ${aumentoVendasNecessario > 0 ? 'text-red-600' : 'text-green-600'}`} />
                </div>
                <h3 className="font-semibold text-gray-700">Meta de Vendas</h3>
              </div>
              {aumentoVendasNecessario > 0 ? (
                <>
                  <div className="text-2xl font-bold text-red-600 mb-1">
                    +{aumentoVendasNecessario.toFixed(1)}%
                  </div>
                  <p className="text-xs text-gray-500">Necessário aumentar o faturamento</p>
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold text-green-600 mb-1">
                    Meta Atingida
                  </div>
                  <p className="text-xs text-gray-500">Receita atual cobre o ponto de equilíbrio</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white shadow-md border-l-4 border-purple-600">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingDown className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-700">Caixa Líquido (Mês 1)</h3>
              </div>
              <div className={`text-2xl font-bold mb-1 ${projecaoCaixa[0].caixa >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(projecaoCaixa[0].caixa)}
              </div>
              <p className="text-xs text-gray-500">Receita - (Custos + Dívidas)</p>
            </CardContent>
          </Card>
        </div>

        {/* Importar DRE */}
        <Card className="mb-6 border-2 border-green-200 bg-green-50">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center gap-4 justify-between">
              <div>
                <h3 className="font-bold text-green-900">Importar dados do DRE & TCMP²</h3>
                <p className="text-sm text-green-700">Preencha automaticamente os campos usando o histórico do DRE.</p>
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <Select value={importMonth} onValueChange={setImportMonth}>
                  <SelectTrigger className="w-[200px] bg-white">
                    <SelectValue placeholder="Selecione um mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {dreList.map(dre => (
                      <SelectItem key={dre.id} value={dre.month}>
                        {new Date(dre.month + '-02').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleImportDRE} className="bg-green-600 hover:bg-green-700">
                  <Download className="w-4 h-4 mr-2" />
                  Importar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6 border-2 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Como funciona:</h3>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>Preencha os valores de dívidas nas 5 categorias para cada mês</li>
                  <li>Informe os custos previstos com peças e administrativos</li>
                  <li>Informe a receita prevista mínima de cada mês</li>
                  <li>O sistema calcula automaticamente o % de comprometimento e gera projeções</li>
                  <li>Classificação automática: 0-10% Excelente | 11-30% Saudável | 31-50% Atenção | 51-80% Alerta | &gt;80% Crítico</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {meses.map((mes, index) => {
            const calculated = calculateMonthData(mes);
            return (
              <Card key={mes.mes} className="shadow-lg border-2">
                <CardHeader className={`${getClassificationColor(calculated.comprometimento)} text-white`}>
                  <CardTitle className="flex items-center justify-between">
                    <span>Mês {mes.mes}</span>
                    <span className="text-2xl font-bold">{calculated.comprometimento.toFixed(0)}%</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <Label className="text-xs">Peças (R$)</Label>
                    <Input
                      type="number"
                      value={mes.pecas}
                      onChange={(e) => updateMes(index, 'pecas', e.target.value)}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Financiamento (R$)</Label>
                    <Input
                      type="number"
                      value={mes.financiamento}
                      onChange={(e) => updateMes(index, 'financiamento', e.target.value)}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Consórcio (R$)</Label>
                    <Input
                      type="number"
                      value={mes.consorcio}
                      onChange={(e) => updateMes(index, 'consorcio', e.target.value)}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Processos Judiciais (R$)</Label>
                    <Input
                      type="number"
                      value={mes.processos_judiciais}
                      onChange={(e) => updateMes(index, 'processos_judiciais', e.target.value)}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Investimento (R$)</Label>
                    <Input
                      type="number"
                      value={mes.investimento}
                      onChange={(e) => updateMes(index, 'investimento', e.target.value)}
                      className="h-8"
                    />
                  </div>
                  
                  <div className="pt-2 border-t border-purple-200">
                    <Label className="text-xs text-purple-700 font-semibold">Custo Previsto Peças (R$)</Label>
                    <Input
                      type="number"
                      value={mes.custo_previsto_pecas}
                      onChange={(e) => updateMes(index, 'custo_previsto_pecas', e.target.value)}
                      className="h-8 border-purple-200"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-xs text-purple-700 font-semibold">Custo Adm/Op (R$)</Label>
                    <Input
                      type="number"
                      value={mes.custo_previsto_administrativo}
                      onChange={(e) => updateMes(index, 'custo_previsto_administrativo', e.target.value)}
                      className="h-8 border-purple-200"
                    />
                  </div>
                  
                  <div className="pt-2 border-t">
                    <Label className="text-xs font-bold">Receita Prevista (R$) *</Label>
                    <Input
                      type="number"
                      value={mes.receita_prevista}
                      onChange={(e) => updateMes(index, 'receita_prevista', e.target.value)}
                      className="h-8 border-2 border-blue-300"
                    />
                  </div>
                  <div className="text-xs text-gray-600 pt-2 space-y-1">
                    <p className="font-semibold">Total Saídas: R$ {(calculated.dividas_total + (mes.custo_previsto_pecas || 0) + (mes.custo_previsto_administrativo || 0)).toFixed(2)}</p>
                    <p className={`font-bold ${mes.receita_prevista - (calculated.dividas_total + (mes.custo_previsto_pecas || 0) + (mes.custo_previsto_administrativo || 0)) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      Caixa Líquido: R$ {(mes.receita_prevista - (calculated.dividas_total + (mes.custo_previsto_pecas || 0) + (mes.custo_previsto_administrativo || 0))).toFixed(2)}
                    </p>
                    <p className="font-bold text-sm mt-1 text-gray-800">Risco: {calculated.classificacao}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            size="lg"
            className="bg-red-600 hover:bg-red-700 text-white px-12 py-6 text-lg"
          >
            {submitting ? (
              <><Loader2 className="w-6 h-6 mr-2 animate-spin" /> Gerando Análise Completa...</>
            ) : (
              "Gerar Painel Inteligente com Projeções"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
