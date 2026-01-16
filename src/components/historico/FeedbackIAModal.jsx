import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, TrendingDown, Target, Users, DollarSign, Activity, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { formatCurrency, formatNumber } from "../utils/formatters";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function FeedbackIAModal({ open, onClose, workshop, record, allRecords }) {
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (open && record && allRecords) {
      generateFeedback();
    }
  }, [open, record, allRecords]);

  const generateFeedback = async () => {
    try {
      setLoading(true);

      // Consolidar dados do mês até a data do registro
      const recordDate = new Date(record.reference_date);
      const monthRecords = allRecords.filter(r => {
        const rDate = new Date(r.reference_date);
        return rDate <= recordDate && r.month === record.month && r.entity_type === "workshop";
      });

      // 1. Calcular totais do mês até agora (dos registros consolidados)
      const realizadoMes = monthRecords.reduce((sum, r) => sum + (r.achieved_total || 0), 0);
      const faturamentoTotal = monthRecords.reduce((sum, r) => sum + (r.revenue_total || 0), 0);
      const faturamentoPecas = monthRecords.reduce((sum, r) => sum + (r.revenue_parts || 0), 0);
      const faturamentoServicos = monthRecords.reduce((sum, r) => sum + (r.revenue_services || 0), 0);
      
      const metaMensal = workshop.monthly_goals?.projected_revenue || 0;
      const percentualMeta = metaMensal > 0 ? (realizadoMes / metaMensal) * 100 : 0;
      const faltaParaMeta = Math.max(0, metaMensal - realizadoMes);

      // 2. Buscar apenas vendas até a data do registro
      const vendasAteData = await base44.entities.VendasServicos.filter({
        workshop_id: workshop.id,
        month: record.month
      });
      
      const vendasFiltradas = vendasAteData.filter(v => {
        const vDate = new Date(v.data);
        return vDate <= recordDate;
      });

      const atribuicoesTodas = await base44.entities.AtribuicoesVenda.filter({
        workshop_id: workshop.id
      });

      const vendasIds = vendasFiltradas.map(v => v.id);
      const atribuicoesFiltradas = atribuicoesTodas.filter(a => vendasIds.includes(a.venda_id));

      // 3. Calcular distribuição por origem (créditos de performance)
      const creditoMarketing = atribuicoesFiltradas
        .filter(a => a.equipe === "marketing")
        .reduce((sum, a) => sum + (a.valor_credito || 0), 0);

      const creditoComercial = atribuicoesFiltradas
        .filter(a => a.equipe === "comercial_vendas" || a.equipe === "sdr_telemarketing")
        .reduce((sum, a) => sum + (a.valor_credito || 0), 0);

      // 4. Identificar clientes "passantes" (vendas sem marketing e SDR)
      const vendasComAtribuicoes = [...new Set(atribuicoesFiltradas.map(a => a.venda_id))];
      const vendasSemFunil = vendasFiltradas.filter(v => !vendasComAtribuicoes.includes(v.id));
      const faturamentoPassantes = vendasSemFunil.reduce((sum, v) => sum + (v.valor_total || 0), 0);
      const qtdClientesPassantes = vendasSemFunil.length;

      // 5. Analisar diferença entre realizado e faturamento
      const diferencaRealizadoFaturamento = realizadoMes - faturamentoTotal;

      // 6. Gerar análise com IA
      const prompt = `Analise os dados de produção e gere um feedback executivo conciso:

CONTEXTO:
- Workshop: ${workshop.name}
- Período: ${new Date(record.reference_date).toLocaleDateString('pt-BR')} (mês ${record.month})
- Dias registrados: ${monthRecords.length}

DESEMPENHO:
- Meta Mensal: R$ ${formatCurrency(metaMensal)}
- Realizado até agora: R$ ${formatCurrency(realizadoMes)}
- Atingimento: ${percentualMeta.toFixed(1)}%
- Falta para meta: R$ ${formatCurrency(faltaParaMeta)}

DISTRIBUIÇÃO POR ORIGEM:
- Faturamento Total Operacional: R$ ${formatCurrency(faturamentoTotal)}
- Crédito Marketing: R$ ${formatCurrency(creditoMarketing)} (${faturamentoTotal > 0 ? ((creditoMarketing/faturamentoTotal)*100).toFixed(1) : 0}%)
- Crédito Comercial/SDR: R$ ${formatCurrency(creditoComercial)} (${faturamentoTotal > 0 ? ((creditoComercial/faturamentoTotal)*100).toFixed(1) : 0}%)
- Clientes Passantes (porta): ${qtdClientesPassantes} clientes = R$ ${formatCurrency(faturamentoPassantes)} (${faturamentoTotal > 0 ? ((faturamentoPassantes/faturamentoTotal)*100).toFixed(1) : 0}%)

ANÁLISE DE VALORES:
- Diferença entre Realizado e Faturamento Operacional: R$ ${formatCurrency(Math.abs(diferencaRealizadoFaturamento))}
- ${diferencaRealizadoFaturamento > 0 ? 'O valor realizado é MAIOR que o faturamento, indicando receitas extras (recebimentos, outras entradas)' : 'O valor realizado está alinhado com o faturamento operacional'}

Gere um feedback em tópicos:
1. Análise do Atingimento da Meta (é bom? está no caminho?)
2. Performance por Canal (qual origem está trazendo mais resultado?)
3. Oportunidades de Melhoria (insights práticos)
4. Alerta sobre valores excedentes (se houver diferença entre realizado e faturamento)`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: false
      });

      setFeedback({
        metricas: {
          metaMensal,
          realizadoMes,
          percentualMeta,
          faltaParaMeta,
          diasRegistrados: monthRecords.length
        },
        distribuicao: {
          faturamentoTotal,
          creditoMarketing,
          creditoComercial,
          faturamentoPassantes,
          qtdClientesPassantes,
          percentualMarketing: faturamentoTotal > 0 ? (creditoMarketing / faturamentoTotal) * 100 : 0,
          percentualComercial: faturamentoTotal > 0 ? (creditoComercial / faturamentoTotal) * 100 : 0,
          percentualPassantes: faturamentoTotal > 0 ? (faturamentoPassantes / faturamentoTotal) * 100 : 0
        },
        valores: {
          diferencaRealizadoFaturamento,
          temDiferenca: Math.abs(diferencaRealizadoFaturamento) > 100
        },
        analiseIA: response
      });

    } catch (error) {
      console.error("Erro ao gerar feedback:", error);
      toast.error("Erro ao gerar análise");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="w-6 h-6 text-purple-600" />
            Análise Inteligente - {new Date(record?.reference_date).toLocaleDateString('pt-BR')}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            <p className="ml-3 text-gray-600">Gerando análise inteligente...</p>
          </div>
        ) : feedback ? (
          <div className="space-y-6">
            {/* Cards de Métricas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-l-4 border-blue-500">
                <CardContent className="p-4">
                  <p className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    Meta Mensal
                  </p>
                  <p className="text-xl font-bold text-blue-600">
                    R$ {formatCurrency(feedback.metricas.metaMensal)}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-green-500">
                <CardContent className="p-4">
                  <p className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Realizado
                  </p>
                  <p className="text-xl font-bold text-green-600">
                    R$ {formatCurrency(feedback.metricas.realizadoMes)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {feedback.metricas.diasRegistrados} dias
                  </p>
                </CardContent>
              </Card>

              <Card className={`border-l-4 ${feedback.metricas.percentualMeta >= 100 ? 'border-green-500' : 'border-orange-500'}`}>
                <CardContent className="p-4">
                  <p className="text-xs text-gray-600 mb-1">Atingimento</p>
                  <p className={`text-xl font-bold ${feedback.metricas.percentualMeta >= 100 ? 'text-green-600' : 'text-orange-600'}`}>
                    {feedback.metricas.percentualMeta.toFixed(1)}%
                  </p>
                  {feedback.metricas.percentualMeta >= 100 && (
                    <p className="text-xs text-green-600 mt-1">✓ Meta batida!</p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-l-4 border-purple-500">
                <CardContent className="p-4">
                  <p className="text-xs text-gray-600 mb-1">Falta p/ Meta</p>
                  <p className="text-xl font-bold text-purple-600">
                    R$ {formatCurrency(feedback.metricas.faltaParaMeta)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Faturamento Real */}
            <Card className="border-2 border-green-500 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-900">
                  <DollarSign className="w-5 h-5" />
                  Faturamento Real da Oficina
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center p-4">
                  <p className="text-sm text-gray-700 mb-2">Valor ÚNICO faturado no mês (não duplicado):</p>
                  <p className="text-4xl font-bold text-green-700">
                    R$ {formatCurrency(feedback.distribuicao.faturamentoTotal)}
                  </p>
                  <p className="text-xs text-gray-600 mt-2">
                    Este é o faturamento real consolidado de todas as vendas/serviços
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Distribuição por Origem (CRÉDITOS) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-600" />
                  Créditos de Performance por Equipe
                </CardTitle>
                <p className="text-sm text-gray-600 mt-2">
                  ⚠️ Os valores abaixo são CRÉDITOS atribuídos para medir performance individual de cada equipe/pessoa. 
                  Uma mesma venda pode gerar crédito para várias equipes (marketing gerou, SDR agendou, vendedor fechou), 
                  por isso a soma dos créditos pode ser maior que o faturamento real.
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-pink-50 rounded-lg border border-pink-200">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-pink-500 rounded-full"></div>
                      <div>
                        <p className="font-semibold text-gray-900">Marketing</p>
                        <p className="text-sm text-gray-600">Crédito de performance (gerou leads)</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-pink-600">
                        R$ {formatCurrency(feedback.distribuicao.creditoMarketing)}
                      </p>
                      <Badge className="bg-pink-100 text-pink-800">
                        {feedback.distribuicao.percentualMarketing.toFixed(1)}% do faturamento
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                      <div>
                        <p className="font-semibold text-gray-900">Comercial / SDR</p>
                        <p className="text-sm text-gray-600">Crédito de performance (agendou/vendeu)</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-indigo-600">
                        R$ {formatCurrency(feedback.distribuicao.creditoComercial)}
                      </p>
                      <Badge className="bg-indigo-100 text-indigo-800">
                        {feedback.distribuicao.percentualComercial.toFixed(1)}% do faturamento
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      <div>
                        <p className="font-semibold text-gray-900">Clientes Passantes (Porta)</p>
                        <p className="text-sm text-gray-600">Faturamento real de clientes sem funil ({feedback.distribuicao.qtdClientesPassantes} clientes)</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-orange-600">
                        R$ {formatCurrency(feedback.distribuicao.faturamentoPassantes)}
                      </p>
                      <Badge className="bg-orange-100 text-orange-800">
                        {feedback.distribuicao.percentualPassantes.toFixed(1)}% do faturamento
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-300">
                  <p className="text-xs text-blue-700 mb-2 font-semibold">💡 Como interpretar:</p>
                  <p className="text-xs text-gray-700">
                    • Os <strong>créditos</strong> medem a performance de cada equipe<br/>
                    • Uma venda de R$ 10.000 pode gerar crédito para marketing (gerou), SDR (agendou) e vendedor (fechou)<br/>
                    • Por isso a soma dos créditos pode ser maior que o faturamento real<br/>
                    • Os percentuais mostram quanto cada equipe contribuiu em relação ao faturamento total
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Alerta sobre diferença entre Realizado e Faturamento */}
            {feedback.valores.temDiferenca && (
              <Card className="border-l-4 border-yellow-500 bg-yellow-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-yellow-900">
                    <DollarSign className="w-5 h-5" />
                    Diferença entre Realizado e Faturamento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700 mb-2">
                    {feedback.valores.diferencaRealizadoFaturamento > 0 ? (
                      <>
                        O valor <strong>Realizado</strong> está <strong className="text-green-600">R$ {formatCurrency(feedback.valores.diferencaRealizadoFaturamento)} acima</strong> do faturamento operacional.
                      </>
                    ) : (
                      <>
                        O valor <strong>Realizado</strong> está <strong className="text-red-600">R$ {formatCurrency(Math.abs(feedback.valores.diferencaRealizadoFaturamento))} abaixo</strong> do faturamento operacional.
                      </>
                    )}
                  </p>
                  <p className="text-xs text-gray-600">
                    Isso pode indicar recebimentos extras, vendas online, ou outras entradas que não estão relacionadas diretamente à operação do mês.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Análise da IA */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  Análise Inteligente e Recomendações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap text-gray-700">
                    {feedback.analiseIA}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">Erro ao carregar análise</p>
        )}

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose} variant="outline">
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}