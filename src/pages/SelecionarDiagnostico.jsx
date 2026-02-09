import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Brain, 
  Users, 
  TrendingUp, 
  DollarSign, 
  BarChart3, 
  Calculator, 
  Rocket,
  ArrowLeft
} from "lucide-react";

export default function SelecionarDiagnostico() {
  const diagnosticOptions = [
    {
      title: "Fase da Oficina",
      description: "Descubra em qual das 4 fases sua oficina se encontra",
      icon: Rocket,
      href: createPageUrl("Questionario"),
      color: "from-blue-500 to-indigo-500"
    },
    {
      title: "Perfil do Empresário",
      description: "Aventureiro, Empreendedor ou Gestor?",
      icon: Users,
      href: createPageUrl("DiagnosticoEmpresario"),
      color: "from-green-500 to-emerald-500"
    },
    {
      title: "Maturidade do Colaborador",
      description: "Avalie o nível de maturidade da sua equipe",
      icon: Brain,
      href: createPageUrl("DiagnosticoMaturidade"),
      color: "from-purple-500 to-pink-500"
    },
    {
      title: "Ordem de Serviço (OS)",
      description: "Análise de rentabilidade e precificação de OS",
      icon: DollarSign,
      href: createPageUrl("DiagnosticoOS"),
      color: "from-yellow-500 to-orange-500"
    },
    {
      title: "Produtividade vs Salário",
      description: "Relação custo x produtividade por colaborador",
      icon: TrendingUp,
      href: createPageUrl("DiagnosticoProducao"),
      color: "from-red-500 to-amber-500"
    },
    {
      title: "Matriz de Desempenho",
      description: "Competências técnicas e emocionais",
      icon: BarChart3,
      href: createPageUrl("DiagnosticoDesempenho"),
      color: "from-teal-500 to-cyan-500"
    },
    {
      title: "Teste DISC",
      description: "Perfil comportamental da equipe",
      icon: Users,
      href: createPageUrl("DiagnosticoDISC"),
      color: "from-indigo-500 to-purple-500"
    },
    {
      title: "Carga de Trabalho",
      description: "Distribuição e sobrecarga da equipe",
      icon: Calculator,
      href: createPageUrl("DiagnosticoCarga"),
      color: "from-orange-500 to-red-500"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
            <Link to={createPageUrl("Home")}>
                <Button variant="ghost" className="gap-2">
                    <ArrowLeft className="w-4 h-4" /> Voltar ao Início
                </Button>
            </Link>
        </div>

        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Qual Diagnóstico Você Deseja Fazer?</h1>
          <p className="text-lg text-gray-600">Escolha o tipo de avaliação para sua oficina ou colaboradores.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {diagnosticOptions.map((option, index) => {
            const Icon = option.icon;
            return (
              <Link key={index} to={option.href}>
                <Card className="group h-full hover:shadow-xl transition-all cursor-pointer border-2 hover:border-blue-200">
                  <CardHeader>
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${option.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <CardTitle className="text-xl font-semibold text-gray-900">
                      {option.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">
                      {option.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}