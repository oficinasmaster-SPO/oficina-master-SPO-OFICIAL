import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, TrendingDown, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function DiagnosticoEndividamento() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  
  const [meses, setMeses] = useState(
    Array.from({ length: 12 }, (_, i) => ({
      mes: i + 1,
      pecas: 0,
      financiamento: 0,
      consorcio: 0,
      processos_judiciais: 0,
      investimento: 0,
      receita_prevista: 0
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

      // Gerar relatório IA
      const prompt = `
Você é um consultor financeiro da metodologia Oficinas Master. Analise o diagnóstico de endividamento abaixo:

RESUMO ANUAL:
- Endividamento total 12 meses: R$ ${endividamento_total_12m.toFixed(2)}
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
- Total Dívidas: R$ ${m.dividas_total.toFixed(2)}
- Receita Prevista: R$ ${m.receita_prevista.toFixed(2)}
- Comprometimento: ${m.comprometimento.toFixed(2)}%
- Classificação: ${m.classificacao}
`).join('\n')}

Gere um relatório executivo completo contendo:

1. DIAGNÓSTICO GERAL DA EMPRESA
2. PONTOS DE ATENÇÃO E RISCOS
3. ANÁLISE DOS MESES CRÍTICOS
4. PLANO DE AÇÃO DETALHADO (priorizado)
5. INSIGHTS COMPORTAMENTAIS DA OPERAÇÃO
6. RECOMENDAÇÕES ESTRATÉGICAS

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
        mes_maior_comprometimento,
        mes_menor_comprometimento,
        media_anual_comprometimento: Number(avgComp.toFixed(2)),
        risco_anual,
        relatorio_ia,
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
            Análise da Curva de Endividamento dos Próximos 12 Meses
          </p>
        </div>

        <Card className="mb-6 border-2 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Como funciona:</h3>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>Preencha os valores de dívidas nas 5 categorias para cada mês</li>
                  <li>Informe a receita prevista mínima de cada mês</li>
                  <li>O sistema calcula automaticamente o % de comprometimento</li>
                  <li>Classificação automática: 0-10% Excelente | 11-30% Saudável | 31-50% Atenção | 51-80% Alerta | >80% Crítico</li>
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
                  <div className="pt-2 border-t">
                    <Label className="text-xs font-bold">Receita Prevista (R$) *</Label>
                    <Input
                      type="number"
                      value={mes.receita_prevista}
                      onChange={(e) => updateMes(index, 'receita_prevista', e.target.value)}
                      className="h-8 border-2 border-blue-300"
                    />
                  </div>
                  <div className="text-xs text-gray-600 pt-2">
                    <p className="font-semibold">Total Dívidas: R$ {calculated.dividas_total.toFixed(2)}</p>
                    <p className="font-bold text-sm mt-1">{calculated.classificacao}</p>
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
              "Gerar Relatório Inteligente com IA"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}