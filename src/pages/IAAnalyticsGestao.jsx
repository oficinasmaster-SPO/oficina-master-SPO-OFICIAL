import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, BrainCircuit, Target, TrendingUp, Users } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function IAAnalyticsGestao() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <BrainCircuit className="w-8 h-8 text-purple-600" />
              IA Analytics de Gestão
            </h1>
            <p className="text-gray-500 mt-1">Insights táticos para otimizar sua equipe e resultados</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-blue-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Análise de Equipe
              </CardTitle>
              <CardDescription>Produtividade e engajamento</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Identifique padrões de desempenho e oportunidades de desenvolvimento para cada membro.
              </p>
              <Button variant="outline" className="w-full">Analisar Equipe</Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-green-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-green-600" />
                Previsão de Metas
              </CardTitle>
              <CardDescription>Tendências e projeções</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Veja a probabilidade de atingimento das metas baseada no ritmo atual.
              </p>
              <Button variant="outline" className="w-full">Ver Projeções</Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-amber-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-600" />
                Detecção de Gargalos
              </CardTitle>
              <CardDescription>Otimização de processos</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                A IA identifica onde os processos estão travando e sugere correções imediatas.
              </p>
              <Button variant="outline" className="w-full">Identificar Gargalos</Button>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-none shadow-inner">
          <CardContent className="p-8 text-center">
            <BrainCircuit className="w-12 h-12 text-purple-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-purple-900 mb-2">Assistente Virtual de Gestão</h3>
            <p className="text-purple-700 max-w-2xl mx-auto mb-6">
              Faça perguntas sobre o desempenho da sua oficina, como "Qual técnico foi mais produtivo esta semana?" ou "Como melhorar a margem de lucro?".
            </p>
            <div className="flex justify-center gap-3">
                <Button className="bg-purple-600 hover:bg-purple-700">Iniciar Chat com IA</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}