import React, { useState } from "react";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, BarChart3, TrendingUp, AlertCircle, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import AnalyticsOverview from "@/components/inteligencia/AnalyticsOverview";
import AnalyticsByArea from "@/components/inteligencia/AnalyticsByArea";
import { useClientIntelligenceAnalytics } from "@/components/hooks/useClientIntelligenceAnalytics";

export default function RelatoriosInteligencia() {
  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);

  React.useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      const workshops = await base44.entities.Workshop.filter({ owner_id: currentUser.id });
      if (workshops?.length > 0) setWorkshop(workshops[0]);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Erro ao carregar dados");
    }
  };

  const { data: allIntelligence = [], isLoading } = useQuery({
    queryKey: ["intelligence", workshop?.id],
    queryFn: () =>
      Promise.all([
        base44.entities.ClientIntelligence.filter({ workshop_id: workshop?.id, type: "dor" }),
        base44.entities.ClientIntelligence.filter({ workshop_id: workshop?.id, type: "duvida" }),
        base44.entities.ClientIntelligence.filter({ workshop_id: workshop?.id, type: "desejo" }),
        base44.entities.ClientIntelligence.filter({ workshop_id: workshop?.id, type: "risco" }),
        base44.entities.ClientIntelligence.filter({ workshop_id: workshop?.id, type: "evolucao" }),
      ]).then(results => results.flat()),
    enabled: !!workshop?.id,
  });

  const analytics = useClientIntelligenceAnalytics(allIntelligence);

  const handleExportPDF = () => {
    toast.success("Funcionalidade em desenvolvimento");
  };

  if (!workshop) {
    return <div className="flex items-center justify-center min-h-screen">Nenhuma oficina encontrada</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Relatórios de Inteligência</h1>
              <p className="text-gray-600 mt-2">{workshop.name}</p>
            </div>
            <Button onClick={handleExportPDF} className="gap-2">
              <Download className="w-4 h-4" />
              Exportar PDF
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="bg-white shadow-md">
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="areas">Por Área</TabsTrigger>
              <TabsTrigger value="tendencias">Tendências</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <AnalyticsOverview analytics={analytics} />
            </TabsContent>

            <TabsContent value="areas" className="space-y-6">
              <AnalyticsByArea analytics={analytics} />
            </TabsContent>

            <TabsContent value="tendencias">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Análise de Tendências
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-500">Em desenvolvimento...</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}