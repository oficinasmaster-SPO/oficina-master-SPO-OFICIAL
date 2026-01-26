import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle2, TrendingUp } from "lucide-react";

export default function SaturacaoLegendaModal({ open, onOpenChange }) {
  const [activeTab, setActiveTab] = useState("calcculo");

  const niveis = [
    {
      label: 'Crítico',
      range: '>150%',
      cor: 'bg-red-600',
      desc: 'Sobrecarga severa',
      cenario: 'Consultor está com mais que 60 horas de trabalho por semana',
      riscos: [
        'Risco de burnout e adoecimento',
        'Queda de qualidade nos atendimentos',
        'Atrasos em tarefas críticas',
        'Insatisfação do cliente',
        'Retrabalho devido a erros'
      ],
      decisoes: [
        'Redistribuir clientes/tarefas para outro consultor imediatamente',
        'Rever cronograma de atendimentos',
        'Priorizar apenas tarefas críticas',
        'Considerar contratação de novo consultor',
        'Pausar novos projetos até normalizar'
      ],
      metricas: 'Tarefas em backlog + Atendimentos confirmados (aba Atendimentos) + Ajuste de vencidas'
    },
    {
      label: 'Alto',
      range: '100-150%',
      cor: 'bg-orange-600',
      desc: 'Sobrecarga',
      cenario: 'Consultor está com 40-60 horas de trabalho por semana',
      riscos: [
        'Qualidade comprometida',
        'Pouco tempo para feedback aos clientes',
        'Risco de atrasos em prazos',
        'Redução de efetividade',
        'Dificuldade em aprender novos processos'
      ],
      decisoes: [
        'Realinhar prioridades com o consultor',
        'Transferir 20-30% das tarefas para outro consultor',
        'Aumentar frequência de check-ins',
        'Revisar timeline dos atendimentos',
        'Considerar contratação se persistir por 2+ semanas'
      ],
      metricas: 'Tarefas em backlog + Atendimentos confirmados + Ajuste de vencidas'
    },
    {
      label: 'Médio',
      range: '70-100%',
      cor: 'bg-yellow-600',
      desc: 'Capacidade boa',
      cenario: 'Consultor está com 28-40 horas de trabalho por semana',
      riscos: [
        'Produtividade próxima ao limite',
        'Pouca margem para imprevistos',
        'Difícil agregar novos clientes'
      ],
      decisoes: [
        'Monitorar se mantém ou volta para baixo',
        'Preparar novos atendimentos com antecedência',
        'Ter plano B caso surja urgência',
        'Considerar adicionar novos clientes com cuidado',
        'Investir em automação de tarefas repetitivas'
      ],
      metricas: 'Tarefas em backlog + Atendimentos confirmados + Ajuste de vencidas'
    },
    {
      label: 'Baixo',
      range: '<70%',
      cor: 'bg-green-600',
      desc: 'Capacidade disponível',
      cenario: 'Consultor está com menos de 28 horas de trabalho por semana',
      riscos: [
        'Subutilização de recursos',
        'Consultor ocioso',
        'Possível desmotivação'
      ],
      decisoes: [
        'Adicionar novos clientes/atendimentos',
        'Designar outras responsabilidades (treinamento, processos)',
        'Redistribuir tarefas de consultores sobrecarregados',
        'Investir em desenvolvimento e capacitação',
        'Aproveitar para planejamento estratégico'
      ],
      metricas: 'Tarefas em backlog + Atendimentos confirmados + Ajuste de vencidas'
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Análise Detalhada da Saturação de Consultores</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="calcculo">Cálculo</TabsTrigger>
            <TabsTrigger value="niveis">Níveis</TabsTrigger>
            <TabsTrigger value="decisoes">Decisões</TabsTrigger>
            <TabsTrigger value="fontes">Fontes de Dados</TabsTrigger>
          </TabsList>

          <TabsContent value="calcculo" className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-sm font-semibold text-gray-900 mb-3">Fórmula Base</p>
              <div className="bg-white p-4 rounded border border-gray-300 font-mono text-sm mb-3">
                <p className="text-gray-800">Saturação = (H_atendimentos + H_tarefas) / 40h × 100</p>
              </div>
              <p className="text-xs text-gray-600 mb-4">Onde 40h é a carga horária semanal padrão</p>

              <p className="text-sm font-semibold text-gray-900 mb-2">Ajuste por Tarefas Vencidas</p>
              <div className="bg-white p-3 rounded border border-gray-300 text-xs text-gray-700 mb-2">
                <p>Saturação Final = Saturação Base + (Qtd. Tarefas Vencidas × 20%)</p>
              </div>
              <p className="text-xs text-gray-600">Cada tarefa vencida adiciona 20% à saturação para refletir o risco e impacto</p>
            </div>

            <div className="bg-blue-50 p-3 rounded border border-blue-200">
              <p className="text-xs text-blue-900">
                <strong>Exemplo:</strong> Um consultor com 30h de atendimentos + 12h de tarefas + 2 tarefas vencidas = (30+12)/40 × 100 + (2×20) = <strong>105%</strong>
              </p>
            </div>
          </TabsContent>

          <TabsContent value="niveis" className="space-y-4">
            {niveis.map((nivel) => (
              <div key={nivel.label} className="border-l-4 border-gray-300 pl-4 py-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-4 h-4 rounded-full ${nivel.cor}`}></div>
                  <p className="font-bold text-gray-900">{nivel.label} ({nivel.range})</p>
                </div>

                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-xs font-semibold text-gray-700 uppercase">Cenário</p>
                    <p className="text-gray-700">{nivel.cenario}</p>
                  </div>

                  <div>
                    <div className="flex items-start gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-gray-700 uppercase">Riscos</p>
                        <ul className="text-gray-700 space-y-1 mt-1">
                          {nivel.riscos.map((risco, i) => (
                            <li key={i} className="text-xs">• {risco}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-gray-700 uppercase">Melhores Decisões</p>
                        <ul className="text-gray-700 space-y-1 mt-1">
                          {nivel.decisoes.map((decisao, i) => (
                            <li key={i} className="text-xs">• {decisao}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="decisoes" className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-semibold text-gray-900 mb-4">Matriz de Decisão por Nível</p>

              <div className="space-y-4">
                <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded">
                  <p className="font-bold text-red-900 mb-2">🔴 CRÍTICO ({'>'}150%): Ação Urgente</p>
                  <ul className="text-sm text-red-800 space-y-1">
                    <li>✓ Redistribuir clientes imediatamente</li>
                    <li>✓ Priorizar tarefas críticas somente</li>
                    <li>✓ Aumentar acompanhamento diário</li>
                    <li>✓ Preparar plano de contratação</li>
                  </ul>
                </div>

                <div className="bg-orange-50 border-l-4 border-orange-600 p-4 rounded">
                  <p className="font-bold text-orange-900 mb-2">🟠 ALTO (100-150%): Ação em Curto Prazo</p>
                  <ul className="text-sm text-orange-800 space-y-1">
                    <li>✓ Transferir 20-30% de tarefas</li>
                    <li>✓ Rever prioridades</li>
                    <li>✓ Check-ins 2x por semana</li>
                    <li>✓ Planejar admissão se persistir</li>
                  </ul>
                </div>

                <div className="bg-yellow-50 border-l-4 border-yellow-600 p-4 rounded">
                  <p className="font-bold text-yellow-900 mb-2">🟡 MÉDIO (70-100%): Monitoramento Ativo</p>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    <li>✓ Monitorar tendência semanal</li>
                    <li>✓ Preparar novos clientes com antecedência</li>
                    <li>✓ Check-in semanal</li>
                    <li>✓ Planejar automações</li>
                  </ul>
                </div>

                <div className="bg-green-50 border-l-4 border-green-600 p-4 rounded">
                  <p className="font-bold text-green-900 mb-2">🟢 BAIXO (&lt;70%): Otimizar Utilização</p>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>✓ Adicionar novos clientes</li>
                    <li>✓ Designar responsabilidades estratégicas</li>
                    <li>✓ Investir em desenvolvimento</li>
                    <li>✓ Auxiliar outros consultores</li>
                  </ul>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="fontes" className="space-y-4">
            <div className="space-y-3 text-sm">
              <div className="bg-blue-50 p-3 rounded border border-blue-200">
                <p className="font-semibold text-blue-900 mb-2">📊 Horas de Atendimentos</p>
                <p className="text-blue-800 text-xs mb-2">Vem da aba: <strong>Atendimentos (Painel)</strong></p>
                <p className="text-blue-700 text-xs">Cálculo: Soma de todas as durações (em minutos) dos atendimentos agendados e confirmados do mês, convertidas para horas.</p>
              </div>

              <div className="bg-green-50 p-3 rounded border border-green-200">
                <p className="font-semibold text-green-900 mb-2">📝 Horas de Tarefas</p>
                <p className="text-green-800 text-xs mb-2">Vem de: <strong>Backlog de Tarefas (TarefaBacklog)</strong></p>
                <p className="text-green-700 text-xs">Cálculo: Soma do campo <code>tempo_estimado_horas</code> de todas as tarefas não-concluídas (status ≠ 'concluida') atribuídas ao consultor.</p>
              </div>

              <div className="bg-purple-50 p-3 rounded border border-purple-200">
                <p className="font-semibold text-purple-900 mb-2">⏰ Ajuste por Tarefas Vencidas</p>
                <p className="text-purple-800 text-xs mb-2">Vem de: <strong>Backlog de Tarefas</strong></p>
                <p className="text-purple-700 text-xs">Cálculo: Conta tarefas onde <code>prazo</code> &lt; hoje E status ≠ 'concluida'. Cada uma adiciona +20% à saturação.</p>
              </div>

              <div className="bg-orange-50 p-3 rounded border border-orange-200">
                <p className="font-semibold text-orange-900 mb-2">📅 Carga Horária Padrão</p>
                <p className="text-orange-800 text-xs">Referência: <strong>40 horas semanais</strong> (configurável por oficina/consultor)</p>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4">
              <p className="text-xs text-gray-700">
                <strong>💡 Dica:</strong> Os dados são atualizados em tempo real. Para uma visão mais precisa, é recomendado atualizar os atendimentos e backlog regularmente, especialmente a conclusão de tarefas.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}