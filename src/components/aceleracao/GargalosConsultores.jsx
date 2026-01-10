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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-blue-600" />
              Como Funciona a Análise de Gargalos
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">📊 O que é um Gargalo?</h3>
              <p className="text-sm text-gray-600">
                Gargalo NÃO é opinião. É uma métrica objetiva que indica quando a <strong>capacidade</strong> do consultor 
                é menor que a <strong>demanda</strong> de trabalho.
              </p>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold text-gray-900 mb-3">🔢 Métricas Calculadas</h3>
              <div className="space-y-3">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="font-semibold text-sm text-blue-900">1️⃣ Capacidade Semanal</p>
                  <p className="text-sm text-gray-700 mt-1">
                    <code className="bg-white px-2 py-1 rounded">Capacidade = Horas Disponíveis × Produtividade Média</code>
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Exemplo: 40h semanais × 70% produtividade = <strong>28h de capacidade real</strong>
                  </p>
                </div>

                <div className="bg-purple-50 p-3 rounded-lg">
                  <p className="font-semibold text-sm text-purple-900">2️⃣ Carga Ativa</p>
                  <p className="text-sm text-gray-700 mt-1">
                    <code className="bg-white px-2 py-1 rounded">Carga Ativa = Σ (Tempo estimado das tarefas abertas)</code>
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Soma das horas de todos os atendimentos agendados e confirmados
                  </p>
                </div>

                <div className="bg-orange-50 p-3 rounded-lg">
                  <p className="font-semibold text-sm text-orange-900">3️⃣ Índice de Saturação (IS)</p>
                  <p className="text-sm text-gray-700 mt-1">
                    <code className="bg-white px-2 py-1 rounded">IS = Carga Ativa ÷ Capacidade Semanal</code>
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Este índice determina se o consultor está no limite ou sobrecarregado
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold text-gray-900 mb-3">🚦 Interpretação do IS</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded bg-green-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">IS ≤ 0,8 = Saudável ✅</p>
                    <p className="text-xs text-gray-600">Consultor com capacidade disponível</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded bg-yellow-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">IS 0,8 - 1,0 = Atenção ⚠️</p>
                    <p className="text-xs text-gray-600">Consultor próximo do limite, evite novas demandas</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded bg-red-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">IS > 1,0 = Gargalo 🚨</p>
                    <p className="text-xs text-gray-600">
                      Consultor sobrecarregado! Capacidade menor que demanda
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-4 bg-yellow-50 p-3 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>💡 Dica:</strong> Use este indicador para balancear a distribuição de clientes 
                entre consultores e evitar sobrecarga.
              </p>
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
              <span>IS > 1,0: Gargalo</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
    </>
  );
}