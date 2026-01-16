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

      // 2. Buscar APENAS AtribuicoesVenda (fonte única de dados)
      const atribuicoesTodas = await base44.entities.AtribuicoesVenda.filter({
        workshop_id: workshop.id
      });

      // 3. Calcular ORIGEM das vendas pela tabela AtribuicoesVenda
      
      // Marketing: soma dos valor_credito onde equipe = "marketing"
      const atribuicoesMarketing = atribuicoesTodas.filter(a => a.equipe === "marketing");
      const faturamentoMarketing = atribuicoesMarketing.reduce((sum, a) => sum + (a.valor_credito || 0), 0);
      const qtdClientesMarketing = [...new Set(atribuicoesMarketing.map(a => a.venda_id))].length;
      
      // Comercial: soma dos valor_credito onde equipe = "sdr_telemarketing" ou "comercial_vendas" E papel = "agendou"
      const atribuicoesComercial = atribuicoesTodas.filter(a => 
        (a.equipe === "sdr_telemarketing" || a.equipe === "comercial_vendas") && a.papel === "agendou"
      );
      const faturamentoComercial = atribuicoesComercial.reduce((sum, a) => sum + (a.valor_credito || 0), 0);
      const qtdClientesComercial = [...new Set(atribuicoesComercial.map(a => a.venda_id))].length;
      
      // Passantes: vendas que NÃO têm marketing E NÃO têm comercial
      const vendasComMarketing = new Set(atribuicoesMarketing.map(a => a.venda_id));
      const vendasComComercial = new Set(atribuicoesComercial.map(a => a.venda_id));
      
      const todasVendasIds = [...new Set(atribuicoesTodas.map(a => a.venda_id))];
      const vendasPassantesIds = todasVendasIds.filter(id => 
        !vendasComMarketing.has(id) && !vendasComComercial.has(id)
      );
      
      const atribuicoesPassantes = atribuicoesTodas.filter(a => vendasPassantesIds.includes(a.venda_id));
      const faturamentoPassantes = atribuicoesPassantes.reduce((sum, a) => sum + (a.valor_credito || 0), 0);
      const qtdClientesPassantes = vendasPassantesIds.length;

      // DEBUG: Log detalhado das atribuições
      console.log('=== DEBUG ORIGEM DAS VENDAS (AtribuicoesVenda) ===');
      console.log('Total de atribuições:', atribuicoesTodas.length);
      console.log('Atribuições Marketing:', atribuicoesMarketing.map(a => ({ venda_id: a.venda_id, valor_credito: a.valor_credito, pessoa: a.pessoa_nome })));
      console.log('Atribuições Comercial:', atribuicoesComercial.map(a => ({ venda_id: a.venda_id, valor_credito: a.valor_credito, pessoa: a.pessoa_nome })));
      console.log('Atribuições Passantes:', atribuicoesPassantes.map(a => ({ venda_id: a.venda_id, valor_credito: a.valor_credito, pessoa: a.pessoa_nome })));
      console.log('Soma Marketing:', faturamentoMarketing);
      console.log('Soma Comercial:', faturamentoComercial);
      console.log('Soma Passantes:', faturamentoPassantes);

      // FATURAMENTO TOTAL das atribuições
      const faturamentoTotalVendas = faturamentoMarketing + faturamentoComercial + faturamentoPassantes;

      // 4. Calcular percentuais da ORIGEM (soma = 100%)
      const percentualMarketing = faturamentoTotalVendas > 0 ? (faturamentoMarketing / faturamentoTotalVendas) * 100 : 0;
      const percentualComercial = faturamentoTotalVendas > 0 ? (faturamentoComercial / faturamentoTotalVendas) * 100 : 0;
      const percentualPassantes = faturamentoTotalVendas > 0 ? (faturamentoPassantes / faturamentoTotalVendas) * 100 : 0;

      // 5. Analisar diferença entre realizado e faturamento
      const diferencaRealizadoFaturamento = realizadoMes - faturamentoTotalVendas;

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

ORIGEM DAS VENDAS (soma = 100%):
- Faturamento Total Vendas: R$ ${formatCurrency(faturamentoTotalVendas)}
- Marketing (leads): R$ ${formatCurrency(faturamentoMarketing)} (${percentualMarketing.toFixed(1)}%) - ${qtdClientesMarketing} clientes
- Comercial (prospecção): R$ ${formatCurrency(faturamentoComercial)} (${percentualComercial.toFixed(1)}%) - ${qtdClientesComercial} clientes  
- Passantes (porta): R$ ${formatCurrency(faturamentoPassantes)} (${percentualPassantes.toFixed(1)}%) - ${qtdClientesPassantes} clientes

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
          faturamentoTotal: faturamentoTotalVendas,
          faturamentoMarketing,
          faturamentoComercial,
          faturamentoPassantes,
          qtdClientesMarketing,
          qtdClientesComercial,
          qtdClientesPassantes,
          percentualMarketing,
          percentualComercial,
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
                  <p className="text-sm text-gray-700 mb-2">Valor ÚNICO faturado no mês (não duplicado):</p>
                  <p className="text-4xl font-bold text-green-700">
                    R$ {formatCurrency(feedback.distribuicao.faturamentoTotal)}
                  </p>
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-900">
                      <strong>⚠️ Importante:</strong> Estes valores representam a <strong>produção operacional da equipe</strong> 
                      (vendas e serviços realizados), <strong>não</strong> são valores de recebimentos financeiros ou compras.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Distribuição por Origem */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-600" />
                  Origem das Vendas (100% do Faturamento)
                </CardTitle>
                <div className="text-sm mt-2 space-y-2">
                  <p className="bg-green-50 p-2 rounded border border-green-200 text-green-700">
                    ✅ Os valores abaixo representam a <strong>ORIGEM</strong> de cada venda e somam exatamente 100% do faturamento real.
                  </p>
                  <p className="bg-blue-50 p-2 rounded border border-blue-200 text-blue-700 text-xs">
                    📊 <strong>Fonte dos dados:</strong> Tabela <code>AtribuicoesVenda</code> (campo <code>valor_credito</code>)<br/>
                    Total de vendas analisadas: {feedback.distribuicao.qtdClientesMarketing + feedback.distribuicao.qtdClientesComercial + feedback.distribuicao.qtdClientesPassantes}
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border-2 border-purple-300">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
                      <div>
                        <p className="font-semibold text-gray-900 text-lg">Marketing</p>
                        <p className="text-sm text-gray-600">Leads pagos/orgânicos</p>
                        <p className="text-xs text-gray-500 mt-1">{feedback.distribuicao.qtdClientesMarketing} clientes</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-purple-700">
                        R$ {formatCurrency(feedback.distribuicao.faturamentoMarketing)}
                      </p>
                      <Badge className="bg-purple-600 text-white mt-1">
                        {feedback.distribuicao.percentualMarketing.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border-2 border-blue-300">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                      <div>
                        <p className="font-semibold text-gray-900 text-lg">Comercial</p>
                        <p className="text-sm text-gray-600">Prospecção ativa/agendamento</p>
                        <p className="text-xs text-gray-500 mt-1">{feedback.distribuicao.qtdClientesComercial} clientes</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-700">
                        R$ {formatCurrency(feedback.distribuicao.faturamentoComercial)}
                      </p>
                      <Badge className="bg-blue-600 text-white mt-1">
                        {feedback.distribuicao.percentualComercial.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border-2 border-gray-400">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 bg-gray-500 rounded-full"></div>
                      <div>
                        <p className="font-semibold text-gray-900 text-lg">Passantes (Porta)</p>
                        <p className="text-sm text-gray-600">Sem marketing e sem comercial</p>
                        <p className="text-xs text-gray-500 mt-1">{feedback.distribuicao.qtdClientesPassantes} clientes</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-700">
                        R$ {formatCurrency(feedback.distribuicao.faturamentoPassantes)}
                      </p>
                      <Badge className="bg-gray-600 text-white mt-1">
                        {feedback.distribuicao.percentualPassantes.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg border-2 border-blue-300">
                  <p className="text-xs text-blue-700 mb-2 font-semibold">💡 Como interpretar:</p>
                  <p className="text-xs text-gray-700 space-y-1">
                    • <strong>Marketing:</strong> Faturamento de vendas originadas de leads (marketing digital, orgânico, etc)<br/>
                    • <strong>Comercial:</strong> Faturamento de vendas sem marketing, mas agendadas pela equipe comercial/SDR<br/>
                    • <strong>Passantes:</strong> Faturamento de clientes que entraram direto pela porta (sem marketing e sem comercial)
                  </p>
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <p className="text-sm font-bold text-blue-900">
                      Soma total: {(feedback.distribuicao.percentualMarketing + feedback.distribuicao.percentualComercial + feedback.distribuicao.percentualPassantes).toFixed(1)}% do faturamento
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