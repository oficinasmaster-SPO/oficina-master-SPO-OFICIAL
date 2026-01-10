import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, TrendingUp, CheckCircle, HelpCircle, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function GargalosConsultores({ consultores }) {
  const [showHelp, setShowHelp] = useState(false);

  // Dados de exemplo para demonstração (remover quando tiver dados reais)
  const dadosExemplo = [
    {
      id: '1',
      nome: 'João Silva',
      capacidade_semanal: 28.0,
      carga_ativa: 22.4,
      produtividade_media: 0.70,
      indice_saturacao: 0.8,
      atendimentos_ativos: 8
    },
    {
      id: '2',
      nome: 'Maria Santos',
      capacidade_semanal: 28.0,
      carga_ativa: 25.2,
      produtividade_media: 0.70,
      indice_saturacao: 0.9,
      atendimentos_ativos: 9
    },
    {
      id: '3',
      nome: 'Pedro Costa',
      capacidade_semanal: 28.0,
      carga_ativa: 30.8,
      produtividade_media: 0.70,
      indice_saturacao: 1.1,
      atendimentos_ativos: 11
    }
  ];

  const dadosParaExibir = consultores?.length > 0 ? consultores : dadosExemplo;

  if (!dadosParaExibir || dadosParaExibir.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Análise de Gargalos - Consultores</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500 py-8">Sem dados disponíveis</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusIS = (is) => {
    if (is <= 0.8) {
      return { 
        label: "Saudável", 
        icon: CheckCircle, 
        color: "bg-green-100 text-green-800",
        barColor: "bg-green-500"
      };
    }
    if (is <= 1.0) {
      return { 
        label: "Atenção", 
        icon: AlertTriangle, 
        color: "bg-yellow-100 text-yellow-800",
        barColor: "bg-yellow-500"
      };
    }
    return { 
      label: "Gargalo", 
      icon: AlertTriangle, 
      color: "bg-red-100 text-red-800",
      barColor: "bg-red-500"
    };
  };

  const consultoresOrdenados = [...dadosParaExibir].sort((a, b) => b.indice_saturacao - a.indice_saturacao);

  return (
    <>
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <HelpCircle className="w-6 h-6 text-blue-600" />
              Análise de Gargalos - Guia Completo
            </DialogTitle>
            <DialogDescription className="text-base">
              Entenda como identificar e resolver gargalos de capacidade na sua equipe de aceleração
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border-l-4 border-blue-600">
              <h3 className="font-semibold text-lg text-gray-900 mb-3 flex items-center gap-2">
                📊 O que é um Gargalo?
              </h3>
              <p className="text-base text-gray-700 mb-3">
                Gargalo <strong>NÃO é opinião</strong>. É uma métrica objetiva, matemática e mensurável que indica quando a 
                <strong className="text-blue-700"> capacidade real</strong> do consultor é <strong className="text-red-700">menor</strong> que a 
                <strong className="text-orange-700"> demanda de trabalho</strong>.
              </p>
              <p className="text-sm text-gray-600 bg-white p-3 rounded">
                <strong>💡 Exemplo prático:</strong> Se um consultor tem 28h de capacidade semanal mas possui 32h de atendimentos 
                agendados, ele está em gargalo. Não há tempo físico para cumprir todas as demandas com qualidade.
              </p>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-semibold text-lg text-gray-900 mb-4">🔢 Como Calculamos as Métricas</h3>
              <div className="space-y-4">
                <div className="bg-blue-50 p-5 rounded-lg border border-blue-200">
                  <p className="font-semibold text-base text-blue-900 mb-2">1️⃣ Capacidade Semanal</p>
                  <p className="text-sm text-gray-700 mb-3">
                    <code className="bg-white px-3 py-1.5 rounded font-mono text-sm">
                      Capacidade = Horas Disponíveis × Produtividade Média
                    </code>
                  </p>
                  <div className="bg-white p-4 rounded-lg space-y-2">
                    <p className="text-sm text-gray-700">
                      <strong>Exemplo prático:</strong>
                    </p>
                    <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
                      <li><strong>Jornada semanal:</strong> 40 horas (8h/dia × 5 dias)</li>
                      <li><strong>Produtividade média:</strong> 70% (explicado abaixo)</li>
                      <li><strong>Capacidade real:</strong> 40h × 70% = <strong className="text-blue-700">28h úteis</strong></li>
                    </ul>
                    <p className="text-xs text-gray-500 mt-2 italic">
                      ⚠️ As 12h restantes (30%) são consumidas por tarefas administrativas, pausas, 
                      imprevistos e outras atividades não-produtivas inerentes ao trabalho.
                    </p>
                  </div>
                </div>

                <div className="bg-purple-50 p-5 rounded-lg border border-purple-200">
                  <p className="font-semibold text-base text-purple-900 mb-2">2️⃣ Carga Ativa (Workload)</p>
                  <p className="text-sm text-gray-700 mb-3">
                    <code className="bg-white px-3 py-1.5 rounded font-mono text-sm">
                      Carga Ativa = Σ (Tempo estimado de cada atendimento aberto)
                    </code>
                  </p>
                  <div className="bg-white p-4 rounded-lg space-y-2">
                    <p className="text-sm text-gray-700">
                      <strong>O que entra no cálculo:</strong>
                    </p>
                    <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
                      <li>Atendimentos com status <strong>agendado</strong></li>
                      <li>Atendimentos com status <strong>confirmado</strong></li>
                      <li>Reuniões não finalizadas (em progresso)</li>
                    </ul>
                    <p className="text-xs text-gray-500 mt-2 italic">
                      ℹ️ Cada atendimento tem uma duração estimada (ex: 1h, 2h). Somamos todas essas horas 
                      para saber quanto trabalho está "pendente" para o consultor.
                    </p>
                  </div>
                </div>

                <div className="bg-orange-50 p-5 rounded-lg border border-orange-200">
                  <p className="font-semibold text-base text-orange-900 mb-2">3️⃣ Índice de Saturação (IS)</p>
                  <p className="text-sm text-gray-700 mb-3">
                    <code className="bg-white px-3 py-1.5 rounded font-mono text-sm">
                      IS = Carga Ativa ÷ Capacidade Semanal
                    </code>
                  </p>
                  <div className="bg-white p-4 rounded-lg space-y-3">
                    <p className="text-sm text-gray-700">
                      <strong>O que o IS significa?</strong>
                    </p>
                    <p className="text-sm text-gray-600">
                      O IS é um <strong>indicador percentual</strong> que mostra quanto da capacidade do consultor 
                      está comprometida com trabalho. É a métrica central para identificar gargalos.
                    </p>
                    <div className="grid grid-cols-3 gap-3 mt-3">
                      <div className="bg-green-50 p-3 rounded border border-green-200">
                        <p className="font-semibold text-sm text-green-800">IS = 0,6 (60%)</p>
                        <p className="text-xs text-gray-600 mt-1">Consultor tem folga para novos clientes</p>
                      </div>
                      <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                        <p className="font-semibold text-sm text-yellow-800">IS = 0,9 (90%)</p>
                        <p className="text-xs text-gray-600 mt-1">Consultor próximo do limite</p>
                      </div>
                      <div className="bg-red-50 p-3 rounded border border-red-200">
                        <p className="font-semibold text-sm text-red-800">IS = 1,2 (120%)</p>
                        <p className="text-xs text-gray-600 mt-1">GARGALO! Capacidade insuficiente</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-semibold text-lg text-gray-900 mb-3">⚙️ Por que 70% de Produtividade e não 100%?</h3>
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-5 rounded-lg border-l-4 border-yellow-500">
                <p className="text-base text-gray-700 mb-3">
                  <strong>Ninguém</strong> consegue trabalhar 100% do tempo de forma produtiva. Estudos de gestão de tempo 
                  mostram que um profissional típico tem aproximadamente <strong>70% de produtividade efetiva</strong>.
                </p>
                <p className="text-sm font-semibold text-gray-800 mb-2">Os outros 30% são consumidos por:</p>
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="bg-white p-3 rounded">
                    <p className="text-sm font-medium text-gray-700">📧 Tarefas Administrativas</p>
                    <p className="text-xs text-gray-600">E-mails, relatórios, documentação, preenchimento de sistemas</p>
                  </div>
                  <div className="bg-white p-3 rounded">
                    <p className="text-sm font-medium text-gray-700">☕ Pausas Necessárias</p>
                    <p className="text-xs text-gray-600">Café, banheiro, almoço estendido, descanso mental</p>
                  </div>
                  <div className="bg-white p-3 rounded">
                    <p className="text-sm font-medium text-gray-700">🚨 Imprevistos</p>
                    <p className="text-xs text-gray-600">Ligações urgentes, problemas técnicos, demandas inesperadas</p>
                  </div>
                  <div className="bg-white p-3 rounded">
                    <p className="text-sm font-medium text-gray-700">💬 Reuniões Internas</p>
                    <p className="text-xs text-gray-600">Alinhamentos, feedbacks, planejamento, treinamentos</p>
                  </div>
                </div>
                <div className="mt-4 bg-blue-600 text-white p-3 rounded">
                  <p className="text-sm">
                    <strong>📊 Benchmark da indústria:</strong> Consultorias de alto desempenho trabalham com 
                    60-75% de taxa de utilização. Usar 100% levaria ao burnout e queda de qualidade.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-semibold text-lg text-gray-900 mb-4">🚦 Como Interpretar o Índice de Saturação (IS)</h3>
              <div className="space-y-3">
                <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600 mt-1" />
                    <div className="flex-1">
                      <p className="font-semibold text-base text-green-900 mb-1">IS ≤ 0,8 (até 80%) = Saudável ✅</p>
                      <p className="text-sm text-gray-700 mb-2">
                        Consultor operando dentro da capacidade ideal, com margem de segurança.
                      </p>
                      <div className="bg-white p-3 rounded text-sm space-y-1">
                        <p className="text-gray-700"><strong>O que fazer:</strong></p>
                        <ul className="ml-4 list-disc text-gray-600 space-y-1">
                          <li>Pode receber novos clientes sem problemas</li>
                          <li>Tem tempo para planejamento e melhoria contínua</li>
                          <li>Capacidade para lidar com imprevistos</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-500">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-6 h-6 text-yellow-600 mt-1" />
                    <div className="flex-1">
                      <p className="font-semibold text-base text-yellow-900 mb-1">IS 0,8 - 1,0 (80% a 100%) = Atenção ⚠️</p>
                      <p className="text-sm text-gray-700 mb-2">
                        Consultor está no limite da capacidade. Zona de risco para sobrecarga.
                      </p>
                      <div className="bg-white p-3 rounded text-sm space-y-1">
                        <p className="text-gray-700"><strong>O que fazer:</strong></p>
                        <ul className="ml-4 list-disc text-gray-600 space-y-1">
                          <li><strong>NÃO</strong> alocar novos clientes neste momento</li>
                          <li>Monitorar de perto: qualquer imprevisto causará atraso</li>
                          <li>Avaliar se algum cliente pode ser redistribuído</li>
                          <li>Planejar com antecedência as próximas semanas</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-500">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-6 h-6 text-red-600 mt-1" />
                    <div className="flex-1">
                      <p className="font-semibold text-base text-red-900 mb-1">IS {`>`} 1,0 (acima de 100%) = GARGALO 🚨</p>
                      <p className="text-sm text-gray-700 mb-2">
                        <strong>ALERTA CRÍTICO!</strong> Consultor com mais demanda do que capacidade física. 
                        Situação insustentável que levará a atrasos, queda de qualidade e burnout.
                      </p>
                      <div className="bg-white p-3 rounded text-sm space-y-1">
                        <p className="text-red-700 font-semibold">⚠️ AÇÃO IMEDIATA NECESSÁRIA:</p>
                        <ul className="ml-4 list-disc text-gray-600 space-y-1">
                          <li><strong>Redistribuir clientes</strong> para outros consultores</li>
                          <li><strong>Reagendar</strong> atendimentos não urgentes</li>
                          <li><strong>Bloquear</strong> novas demandas até normalizar</li>
                          <li>Analisar se há tarefas que podem ser delegadas</li>
                          <li>Avaliar possibilidade de contratação urgente</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-lg">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  💡 Melhores Práticas de Gestão
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="font-medium mb-2">✅ Faça regularmente:</p>
                    <ul className="text-sm space-y-1 opacity-90">
                      <li>• Revisar semanalmente este indicador</li>
                      <li>• Planejar alocações com 2+ semanas de antecedência</li>
                      <li>• Manter IS dos consultores entre 0,6 e 0,8</li>
                      <li>• Distribuir carga uniformemente</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium mb-2">❌ Evite:</p>
                    <ul className="text-sm space-y-1 opacity-90">
                      <li>• Alocar clientes sem consultar o IS</li>
                      <li>• Ignorar alertas de "Atenção" ou "Gargalo"</li>
                      <li>• Concentrar clientes em poucos consultores</li>
                      <li>• Deixar consultores ociosos (IS {`<`} 0,5)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              Análise de Gargalos - Consultores
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHelp(true)}
                className="h-6 w-6 p-0 hover:bg-blue-50"
              >
                <HelpCircle className="w-4 h-4 text-blue-600" />
              </Button>
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Índice de Saturação (IS) = Carga Ativa ÷ Capacidade Semanal
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="text-left p-3 text-xs font-semibold text-gray-700">Consultor</th>
                <th className="text-center p-3 text-xs font-semibold text-gray-700">Capacidade (h/sem)</th>
                <th className="text-center p-3 text-xs font-semibold text-gray-700">Carga Ativa (h)</th>
                <th className="text-center p-3 text-xs font-semibold text-gray-700">Produtividade</th>
                <th className="text-center p-3 text-xs font-semibold text-gray-700">IS</th>
                <th className="text-center p-3 text-xs font-semibold text-gray-700">Status</th>
                <th className="text-left p-3 text-xs font-semibold text-gray-700">Saturação</th>
              </tr>
            </thead>
            <tbody>
              {consultoresOrdenados.map((consultor) => {
                const status = getStatusIS(consultor.indice_saturacao);
                const StatusIcon = status.icon;
                const saturacaoPercentual = Math.min(consultor.indice_saturacao * 100, 100);

                return (
                  <tr key={consultor.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium text-gray-900">{consultor.nome}</td>
                    <td className="p-3 text-center">
                      <span className="font-semibold text-gray-700">
                        {consultor.capacidade_semanal?.toFixed(1) || 0}h
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="font-semibold text-blue-600">
                        {consultor.carga_ativa?.toFixed(1) || 0}h
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="text-sm text-gray-600">
                        {(consultor.produtividade_media * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`font-bold text-lg ${
                        consultor.indice_saturacao > 1.0 ? 'text-red-600' :
                        consultor.indice_saturacao > 0.8 ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {consultor.indice_saturacao?.toFixed(2) || 0}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <Badge className={status.color}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {status.label}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={saturacaoPercentual} 
                          className="h-2 flex-1"
                          indicatorClassName={status.barColor}
                        />
                        <span className="text-xs text-gray-600 min-w-[3rem] text-right">
                          {saturacaoPercentual.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-semibold text-gray-700 mb-2">Legenda:</p>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500" />
              <span>IS ≤ 0,8: Saudável</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-yellow-500" />
              <span>IS 0,8 - 1,0: Atenção</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span>IS {`>`} 1,0: Gargalo</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
    </>
  );
}