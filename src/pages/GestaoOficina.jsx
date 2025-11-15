import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Building2, Settings, Target, FileText, Users, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import DadosBasicosOficina from "../components/workshop/DadosBasicosOficina";
import ServicosEquipamentos from "../components/workshop/ServicosEquipamentos";
import ServicosTerceirizados from "../components/workshop/ServicosTerceirizados";
import MetasObjetivos from "../components/workshop/MetasObjetivos";
import CulturaOrganizacional from "../components/workshop/CulturaOrganizacional";
import DocumentosProcessos from "../components/workshop/DocumentosProcessos";

export default function GestaoOficina() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [workshop, setWorkshop] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const workshops = await base44.entities.Workshop.list();
      const userWorkshop = workshops.find(w => w.owner_id === currentUser.id);

      if (!userWorkshop) {
        toast.error("Nenhuma oficina cadastrada");
        navigate(createPageUrl("Cadastro"));
        return;
      }

      setWorkshop(userWorkshop);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dados");
      base44.auth.redirectToLogin();
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (data) => {
    try {
      await base44.entities.Workshop.update(workshop.id, data);
      await loadData();
      toast.success("Oficina atualizada!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!workshop) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{workshop.name}</h1>
              <p className="text-lg text-gray-600 mt-1">
                {workshop.city} - {workshop.state}
              </p>
              <div className="flex gap-2 mt-3">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                  {workshop.segment}
                </span>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                  Nível {workshop.maturity_level || 1}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Engajamento</p>
              <p className="text-2xl font-bold text-blue-600">{workshop.engagement_score || 0}%</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="dados" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 bg-white shadow-md">
            <TabsTrigger value="dados">
              <Building2 className="w-4 h-4 mr-2" />
              Dados Básicos
            </TabsTrigger>
            <TabsTrigger value="servicos">
              <Settings className="w-4 h-4 mr-2" />
              Serviços
            </TabsTrigger>
            <TabsTrigger value="terceiros">
              <Users className="w-4 h-4 mr-2" />
              Terceiros
            </TabsTrigger>
            <TabsTrigger value="metas">
              <Target className="w-4 h-4 mr-2" />
              Metas
            </TabsTrigger>
            <TabsTrigger value="cultura">
              <TrendingUp className="w-4 h-4 mr-2" />
              Cultura
            </TabsTrigger>
            <TabsTrigger value="documentos">
              <FileText className="w-4 h-4 mr-2" />
              Processos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dados">
            <DadosBasicosOficina workshop={workshop} onUpdate={handleUpdate} />
          </TabsContent>

          <TabsContent value="servicos">
            <ServicosEquipamentos workshop={workshop} onUpdate={handleUpdate} />
          </TabsContent>

          <TabsContent value="terceiros">
            <ServicosTerceirizados workshop={workshop} onUpdate={handleUpdate} />
          </TabsContent>

          <TabsContent value="metas">
            <MetasObjetivos workshop={workshop} onUpdate={handleUpdate} />
          </TabsContent>

          <TabsContent value="cultura">
            <CulturaOrganizacional workshop={workshop} onUpdate={handleUpdate} />
          </TabsContent>

          <TabsContent value="documentos">
            <DocumentosProcessos workshop={workshop} onUpdate={handleUpdate} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}