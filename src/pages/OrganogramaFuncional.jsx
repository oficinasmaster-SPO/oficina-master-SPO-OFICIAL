import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Info, Users, Target, TrendingUp, Download, FileText } from "lucide-react";
import FunctionalOrgChart from "@/components/organization/FunctionalOrgChart";
import { generateFunctionalOrgChartPDF } from "@/components/organization/FunctionalOrgChartPDFGenerator";

export default function OrganogramaFuncional() {
  const [workshop, setWorkshop] = useState(null);

  React.useEffect(() => {
    const loadWorkshop = async () => {
      try {
        const user = await base44.auth.me();
        const workshops = await base44.entities.Workshop.filter({ owner_id: user.id });
        if (workshops && workshops.length > 0) {
          setWorkshop(workshops[0]);
        }
      } catch (error) {
        console.error("Erro ao carregar oficina:", error);
      }
    };
    loadWorkshop();
  }, []);

  const { data: structuralNodes = [], isLoading: loadingNodes } = useQuery({
    queryKey: ['orgchart-nodes', workshop?.id],
    queryFn: async () => {
      if (!workshop?.id) return [];
      return await base44.entities.OrgChartNode.filter({ workshop_id: workshop.id });
    },
    enabled: !!workshop?.id,
  });

  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ['employees', workshop?.id],
    queryFn: async () => {
      if (!workshop?.id) return [];
      return await base44.entities.Employee.filter({ workshop_id: workshop.id, status: 'ativo' });
    },
    enabled: !!workshop?.id,
  });

  if (!workshop) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">Carregando dados da oficina...</p>
      </div>
    );
  }

  if (loadingNodes || loadingEmployees) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">Carregando organograma...</p>
      </div>
    );
  }

  if (structuralNodes.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4 mx-auto">
              <Users className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              Organograma Estrutural não criado
            </h3>
            <p className="text-gray-600 mb-6">
              Primeiro você precisa criar o organograma estrutural (áreas e funções)
            </p>
            <Button onClick={() => window.location.href = '/OrganogramaEstrutural'}>
              Ir para Organograma Estrutural
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Card Informativo */}
      <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-purple-600 rounded-lg">
              <Info className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl font-bold text-purple-900">
                Organograma Funcional e Operacional
              </CardTitle>
              <CardDescription className="text-purple-700 mt-1">
                Mostra as pessoas com fotos, nomes e cargos
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Target className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-purple-900">O que ele responde</h3>
                  <p className="text-sm text-purple-700">Quem ocupa cada função e para quem responde</p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Users className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-purple-900">Para que serve</h3>
                  <ul className="text-sm text-purple-700 space-y-1">
                    <li>• Clareza de hierarquia</li>
                    <li>• Comunicação eficiente</li>
                    <li>• Onboarding de novos colaboradores</li>
                    <li>• Identificação de vagas em aberto</li>
                    <li>• Cultura organizacional visível</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <TrendingUp className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-purple-900">Quando usar</h3>
                  <p className="text-sm text-purple-700 mb-2">Para situações operacionais:</p>
                  <ul className="text-sm text-purple-700 space-y-1">
                    <li>✔ Apresentar a equipe</li>
                    <li>✔ Esclarecer hierarquias</li>
                    <li>✔ Facilitar comunicação interna</li>
                    <li>✔ Identificar responsáveis</li>
                    <li>✔ Planejamento de sucessão</li>
                  </ul>
                </div>
              </div>

              <div className="bg-purple-600 text-white p-4 rounded-lg">
                <p className="text-sm font-medium italic">
                  💡 "Pessoas são o coração da operação."
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Organograma */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold">Organograma com Pessoas</CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Equipe e hierarquia de {workshop.name}
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => generateFunctionalOrgChartPDF(structuralNodes, employees, workshop, false)} 
              variant="outline"
            >
              <FileText className="w-4 h-4 mr-2" />
              Visualizar PDF
            </Button>
            <Button 
              onClick={() => generateFunctionalOrgChartPDF(structuralNodes, employees, workshop, true)} 
              variant="outline"
            >
              <Download className="w-4 h-4 mr-2" />
              Baixar PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <FunctionalOrgChart 
            structuralNodes={structuralNodes} 
            employees={employees}
            workshop={workshop}
          />
        </CardContent>
      </Card>
    </div>
  );
}