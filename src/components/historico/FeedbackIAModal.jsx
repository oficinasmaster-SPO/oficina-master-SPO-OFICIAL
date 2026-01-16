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
      const faturamentoTotalConsolidado = monthRecords.reduce((sum, r) => sum + (r.revenue_total || 0), 0);
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

      // 3. Calcular ORIGEM das vendas (soma 100% do faturamento)
      
      // Identificar vendas por origem
      const vendasComMarketing = [...new Set(atribuicoesFiltradas
        .filter(a => a.equipe === "marketing")
        .map(a => a.venda_id))];
      
      const vendasComComercial = [...new Set(atribuicoesFiltradas
        .filter(a => (a.equipe === "sdr_telemarketing" || a.equipe === "comercial_vendas") && a.papel === "agendou")
        .map(a => a.venda_id))];

      // Garantir vendas ÚNICAS para contagem
      const vendasUnicas = Array.from(new Map(vendasFiltradas.map(v => [v.id, v])).values());
      
      // Consolidar CRÉDITOS por EQUIPE
      const creditoMarketing = atribuicoesFiltradas
        .filter(a => a.equipe === "marketing")
        .reduce((sum, a) => sum + (a.valor_credito_atribuido || 0), 0);
      
      const creditoComercial = atribuicoesFiltradas
        .filter(a => (a.equipe === "sdr_telemarketing" || a.equipe === "comercial_vendas"))
        .reduce((sum, a) => sum + (a.valor_credito_atribuido || 0), 0);
      
      const creditoVendas = atribuicoesFiltradas
        .filter(a => a.equipe === "vendas")
        .reduce((sum, a) => sum + (a.valor_credito_atribuido || 0), 0);
      
      const creditoTecnico = atribuicoesFiltradas
        .filter(a => a.equipe === "tecnico")
        .reduce((sum, a) => sum + (a.valor_credito_atribuido || 0), 0);
      
      // Consolidar PESSOAS por EQUIPE (elimina duplicatas)
      const pessoasMarketing = [...new Set(atribuicoesFiltradas.filter(a => a.equipe === "marketing").map(a => a.pessoa_id))].length;
      const pessoasComercial = [...new Set(atribuicoesFiltradas.filter(a => a.equipe === "sdr_telemarketing" || a.equipe === "comercial_vendas").map(a => a.pessoa_id))].length;
      const pessoasVendas = [...new Set(atribuicoesFiltradas.filter(a => a.equipe === "vendas").map(a => a.pessoa_id))].length;
      const pessoasTecnico = [...new Set(atribuicoesFiltradas.filter(a => a.equipe === "tecnico").map(a => a.pessoa_id))].length;
      
      // Passantes = vendas sem nenhuma atribuição
      const vendasComAtribuicao = [...new Set(atribuicoesFiltradas.map(a => a.venda_id))];
      const vendasOrigemPassantes = vendasUnicas.filter(v => !vendasComAtribuicao.includes(v.id));
      const faturamentoPassantes = vendasOrigemPassantes.reduce((sum, v) => sum + (v.valor_total || 0), 0);
      const qtdClientesPassantes = vendasOrigemPassantes.length;

      // 4. Calcular percentuais em relação ao faturamento consolidado
      const percentualMarketing = faturamentoTotalConsolidado > 0 ? (creditoMarketing / faturamentoTotalConsolidado) * 100 : 0;
      const percentualComercial = faturamentoTotalConsolidado > 0 ? (creditoComercial / faturamentoTotalConsolidado) * 100 : 0;
      const percentualVendas = faturamentoTotalConsolidado > 0 ? (creditoVendas / faturamentoTotalConsolidado) * 100 : 0;
      const percentualTecnico = faturamentoTotalConsolidado > 0 ? (creditoTecnico / faturamentoTotalConsolidado) * 100 : 0;
      const percentualPassantes = faturamentoTotalConsolidado > 0 ? (faturamentoPassantes / faturamentoTotalConsolidado) * 100 : 0;

      // 5. Analisar diferença entre realizado e faturamento
      const diferencaRealizadoFaturamento = realizadoMes - faturamentoTotalConsolidado;

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

FATURAMENTO CONSOLIDADO:
- Peças: R$ ${formatCurrency(faturamentoPecas)}
- Serviços: R$ ${formatCurrency(faturamentoServicos)}
- Total: R$ ${formatCurrency(faturamentoTotalConsolidado)}

CRÉDITOS CONSOLIDADOS POR EQUIPE:
- Marketing: R$ ${formatCurrency(creditoMarketing)} (${percentualMarketing.toFixed(1)}% do faturamento) - ${pessoasMarketing} pessoa(s)
- Comercial/SDR: R$ ${formatCurrency(creditoComercial)} (${percentualComercial.toFixed(1)}%) - ${pessoasComercial} pessoa(s)
- Vendas: R$ ${formatCurrency(creditoVendas)} (${percentualVendas.toFixed(1)}%) - ${pessoasVendas} pessoa(s)
- Técnico: R$ ${formatCurrency(creditoTecnico)} (${percentualTecnico.toFixed(1)}%) - ${pessoasTecnico} pessoa(s)
- Passantes: R$ ${formatCurrency(faturamentoPassantes)} (${percentualPassantes.toFixed(1)}%) - ${qtdClientesPassantes} vendas

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
          faturamentoTotal: faturamentoTotalConsolidado,
          faturamentoPecas,
          faturamentoServicos,
          creditoMarketing,
          creditoComercial,
          creditoVendas,
          creditoTecnico,
          faturamentoPassantes,
          pessoasMarketing,
          pessoasComercial,
          pessoasVendas,
          pessoasTecnico,
          qtdClientesPassantes,
          percentualMarketing,
          percentualComercial,
          percentualVendas,
          percentualTecnico,
          percentualPassantes
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
                  <p className="text-sm text-gray-700 mb-2">Faturamento Total (Peças + Serviços):</p>
                  <p className="text-4xl font-bold text-green-700">
                    R$ {formatCurrency(feedback.distribuicao.faturamentoTotal)}
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Peças</p>
                      <p className="text-2xl font-bold text-blue-700">
                        R$ {formatCurrency(feedback.distribuicao.faturamentoPecas)}
                      </p>
                    </div>
                    <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Serviços</p>
                      <p className="text-2xl font-bold text-indigo-700">
                        R$ {formatCurrency(feedback.distribuicao.faturamentoServicos)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-900">
                      <strong>⚠️ Fonte:</strong> Valores consolidados da tabela <strong>MonthlyGoalHistory</strong> 
                      (registros diários somados de peças e serviços).
                    </p>
                  </div>
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