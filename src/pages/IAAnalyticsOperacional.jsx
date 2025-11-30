import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Sparkles, CheckSquare, PlayCircle, Zap } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function IAAnalyticsOperacional() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-8 h-8 text-blue-500" />
              Assistente Operacional
            </h1>
            <p className="text-gray-500 mt-1">Dicas práticas e passo a passo para o seu dia a dia</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-t-4 border-t-blue-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-blue-600" />
                Checklists Inteligentes
              </CardTitle>
              <CardDescription>O que fazer agora</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Receba listas de tarefas priorizadas pela IA com base nas OS em aberto e prazos.
              </p>
              <Button variant="secondary" className="w-full">Ver Minhas Prioridades</Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-t-4 border-t-green-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlayCircle className="w-5 h-5 text-green-600" />
                Tutoriais Passo a Passo
              </CardTitle>
              <CardDescription>Como executar tarefas</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Dúvidas em um procedimento? A IA te guia com instruções claras e diretas.
              </p>
              <Button variant="secondary" className="w-full">Buscar Procedimento</Button>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white shadow-md">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    Dicas Rápidas
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <h4 className="font-semibold text-blue-900 mb-1">Melhorando sua eficiência</h4>
                    <p className="text-sm text-blue-800">
                        Técnicos que preenchem o checklist inicial completo reduzem o tempo de diagnóstico em até 30%. Lembre-se de fotografar as avarias!
                    </p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                    <h4 className="font-semibold text-green-900 mb-1">Meta da Semana</h4>
                    <p className="text-sm text-green-800">
                        Faltam apenas 2 OSs finalizadas para você bater sua meta semanal de produtividade. Vamos lá!
                    </p>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}