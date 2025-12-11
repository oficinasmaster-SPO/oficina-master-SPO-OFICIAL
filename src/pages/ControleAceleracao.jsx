import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, BarChart3, Calendar, FileText, Settings, ClipboardList } from "lucide-react";
import VisaoGeralTab from "@/components/aceleracao/VisaoGeralTab";
import PainelAtendimentosTab from "@/components/aceleracao/PainelAtendimentosTab";
import CronogramaAceleracaoTab from "@/components/aceleracao/CronogramaAceleracaoTab";
import TemplatesTab from "@/components/aceleracao/TemplatesTab";
import RelatoriosTab from "@/components/aceleracao/RelatoriosTab";

export default function ControleAceleracao() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("visao-geral");

  const { data: user, isLoading: loadingUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  // Verificar permissão
  if (loadingUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user || (user.role !== 'admin' && user.job_role !== 'acelerador')) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Acesso restrito a consultores e aceleradores</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Controle da Aceleração</h1>
          <p className="text-gray-600 mt-2">
            Gestão completa de clientes, atendimentos e cronogramas
          </p>
        </div>
        <Button
          onClick={() => navigate(createPageUrl('RegistrarAtendimento'))}
          className="bg-blue-600 hover:bg-blue-700"
        >
          + Novo Atendimento
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 bg-white shadow-md">
          <TabsTrigger value="visao-geral">
            <BarChart3 className="w-4 h-4 mr-2" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="atendimentos">
            <ClipboardList className="w-4 h-4 mr-2" />
            Atendimentos
          </TabsTrigger>
          <TabsTrigger value="cronograma">
            <Calendar className="w-4 h-4 mr-2" />
            Cronograma
          </TabsTrigger>
          <TabsTrigger value="templates">
            <Settings className="w-4 h-4 mr-2" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="relatorios">
            <FileText className="w-4 h-4 mr-2" />
            Relatórios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral">
          <VisaoGeralTab user={user} />
        </TabsContent>

        <TabsContent value="atendimentos">
          <PainelAtendimentosTab user={user} />
        </TabsContent>

        <TabsContent value="cronograma">
          <CronogramaAceleracaoTab user={user} />
        </TabsContent>

        <TabsContent value="templates">
          <TemplatesTab user={user} />
        </TabsContent>

        <TabsContent value="relatorios">
          <RelatoriosTab user={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
}