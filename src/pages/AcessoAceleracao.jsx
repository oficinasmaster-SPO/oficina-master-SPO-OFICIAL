import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, Calendar, Briefcase } from "lucide-react";

export default function AcessoAceleracao() {
  const navigate = useNavigate();

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-3">
          <Briefcase className="w-10 h-10 text-purple-600" />
          Programa de Aceleração
        </h1>
        <p className="text-lg text-gray-600">
          Acompanhe seu progresso e cronograma de atendimentos
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card 
          className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200 hover:border-purple-300 hover:shadow-lg transition-all cursor-pointer"
          onClick={() => navigate(createPageUrl("PainelClienteAceleracao"))}
        >
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center">
              <Target className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-purple-900 mb-3">
              Meu Plano de Aceleração
            </h2>
            <p className="text-gray-600 mb-6">
              Visualize seu progresso, tarefas pendentes e próximos marcos do programa
            </p>
            <Button className="bg-purple-600 hover:bg-purple-700 w-full">
              Acessar Meu Plano
            </Button>
          </CardContent>
        </Card>

        <Card 
          className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer"
          onClick={() => navigate(createPageUrl("CronogramaConsultoria"))}
        >
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center">
              <Calendar className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-blue-900 mb-3">
              Cronograma de Atendimentos
            </h2>
            <p className="text-gray-600 mb-6">
              Reuniões agendadas, atas de consultoria e histórico de atendimentos
            </p>
            <Button className="bg-blue-600 hover:bg-blue-700 w-full">
              Ver Cronograma
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}