import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, BarChart3, Calendar, FileText, Settings, ClipboardList, Users } from "lucide-react";
import VisaoGeralTab from "@/components/aceleracao/VisaoGeralTab";
import PainelAtendimentosTab from "@/components/aceleracao/PainelAtendimentosTab";
import TemplatesTab from "@/components/aceleracao/TemplatesTab";
import RegistroAtendimentoMassaModal from "@/components/aceleracao/RegistroAtendimentoMassaModal";

export default function ControleAceleracao() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("visao-geral");
  const [showMassRegistration, setShowMassRegistration] = useState(false);

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
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Acesso Restrito</h2>
          <p className="text-gray-600">
            Esta área é restrita a consultores e aceleradores.
          </p>
        </div>
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
        <div className="flex gap-3">
          <Button
            onClick={() => setShowMassRegistration(true)}
            variant="outline"
            className="border-blue-600 text-blue-600 hover:bg-blue-50"
          >
            <Users className="w-4 h-4 mr-2" />
            Registro em Massa
          </Button>
          <Button
            onClick={() => navigate(createPageUrl('RegistrarAtendimento'))}
            className="bg-blue-600 hover:bg-blue-700"
          >
            + Novo Atendimento
          </Button>
        </div>
      </div>

      <RegistroAtendimentoMassaModal
        open={showMassRegistration}
        onClose={() => setShowMassRegistration(false)}
        user={user}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-white shadow-md">
          <TabsTrigger value="visao-geral">
            <BarChart3 className="w-4 h-4 mr-2" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="atendimentos">
            <ClipboardList className="w-4 h-4 mr-2" />
            Atendimentos
          </TabsTrigger>
          <TabsTrigger 
            value="cronograma"
            onClick={() => navigate(createPageUrl('CronogramaGeral'))}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Cronograma Geral
          </TabsTrigger>
          <TabsTrigger value="templates">
            <Settings className="w-4 h-4 mr-2" />
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral">
          <VisaoGeralTab user={user} />
        </TabsContent>

        <TabsContent value="atendimentos">
          <PainelAtendimentosTab user={user} />
        </TabsContent>

        <TabsContent value="pedidos">
          <PedidosInternosTab user={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
}