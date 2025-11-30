import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, BarChart2, Users, Settings, Calculator, ClipboardList, UserCheck, Heart } from "lucide-react";

export default function SeletorDiagnosticos() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get("role"); // 'gestor' ou 'colaborador'

  // Definição dos diagnósticos permitidos por papel (Whitelist)
  const diagnostics = {
    gestor: [
      {
        id: "dre",
        title: "DRE & TCMP²",
        description: "Análise financeira completa, margem de contribuição e ponto de equilíbrio.",
        icon: Calculator,
        color: "text-blue-600",
        bg: "bg-blue-50",
        path: "DRETCMP2"
      },
      {
        id: "r70i30",
        title: "R70 / I30",
        description: "Indicadores de eficiência produtiva e qualidade operacional.",
        icon: BarChart2,
        color: "text-green-600",
        bg: "bg-green-50",
        path: "DiagnosticoProducao" // Ajustar para rota correta se existir, ou placeholder
      },
      {
        id: "processos",
        title: "Processos (ProcessAssessment)",
        description: "Avaliação da maturidade dos processos internos da oficina.",
        icon: Settings,
        color: "text-purple-600",
        bg: "bg-purple-50",
        path: "Autoavaliacoes"
      },
      {
        id: "pessoas",
        title: "Gestão de Pessoas",
        description: "Matriz de desempenho, maturidade e produtividade da equipe.",
        icon: Users,
        color: "text-orange-600",
        bg: "bg-orange-50",
        path: "DiagnosticoDesempenho"
      },
      {
        id: "comercial",
        title: "Funil & Endividamento",
        description: "Saúde financeira e eficiência comercial.",
        icon: FileText,
        color: "text-red-600",
        bg: "bg-red-50",
        path: "DiagnosticoEndividamento"
      }
    ],
    colaborador: [
      {
        id: "operacional",
        title: "Processos Operacionais",
        description: "Checklists e procedimentos do seu setor.",
        icon: ClipboardList,
        color: "text-blue-600",
        bg: "bg-blue-50",
        path: "HomeOperacional" // Redireciona para home operacional onde tem checklists
      },
      {
        id: "maturidade",
        title: "Minha Maturidade",
        description: "Autoavaliação guiada para desenvolvimento profissional.",
        icon: UserCheck,
        color: "text-green-600",
        bg: "bg-green-50",
        path: "DiagnosticoMaturidade" // Ajustar se for autoavaliação
      },
      {
        id: "feedback",
        title: "Meus Feedbacks",
        description: "Visualize feedbacks recebidos e pontos de melhoria.",
        icon: Heart,
        color: "text-pink-600",
        bg: "bg-pink-50",
        path: "ResultadoDesempenho"
      }
    ]
  };

  // Fallback: se não vier role na URL, tenta inferir ou mostra operacional (mais restrito)
  const activeList = diagnostics[roleParam] || diagnostics.colaborador;

  const handleSelect = (path) => {
    navigate(createPageUrl(path));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Diagnósticos Disponíveis</h1>
          <p className="text-gray-600 mt-2">
            Selecione uma ferramenta de avaliação para iniciar
            {roleParam === 'gestor' && <span className="ml-1 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Modo Gestão</span>}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeList.map((diag) => {
            const Icon = diag.icon;
            return (
              <Card 
                key={diag.id} 
                className="hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-blue-100"
                onClick={() => handleSelect(diag.path)}
              >
                <CardHeader>
                  <div className={`w-12 h-12 rounded-xl ${diag.bg} flex items-center justify-center mb-4`}>
                    <Icon className={`w-6 h-6 ${diag.color}`} />
                  </div>
                  <CardTitle className="text-lg">{diag.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {diag.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}