import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ArrowLeft, User, FileText, MessageSquare, AlertTriangle, Award, TrendingUp, FileCheck, Heart, FilePenLine, Activity } from "lucide-react";
import { toast } from "sonner";
import DadosPessoais from "../components/employee/DadosPessoais";
import RemuneracaoProducao from "../components/employee/RemuneracaoProducao";
import FeedbacksSection from "../components/employee/FeedbacksSection";
import AdvertenciasSection from "../components/employee/AdvertenciasSection";
import DiagnosticosVinculados from "../components/employee/DiagnosticosVinculados";
import DocumentosAnexos from "../components/employee/DocumentosAnexos";
import PainelProducao from "../components/employee/PainelProducao";
import COEXCDCIntegration from "../components/rh/COEXCDCIntegration";
import PerformanceMonitoring from "../components/rh/PerformanceMonitoring";

export default function DetalhesColaborador() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState(null);

  useEffect(() => {
    loadEmployee();
  }, []);

  const loadEmployee = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const employeeId = urlParams.get("id");

      if (!employeeId) {
        toast.error("Colaborador não encontrado");
        navigate(createPageUrl("Colaboradores"));
        return;
      }

      const employees = await base44.entities.Employee.list();
      const current = employees.find(e => e.id === employeeId);

      if (!current) {
        toast.error("Colaborador não encontrado");
        navigate(createPageUrl("Colaboradores"));
        return;
      }

      setEmployee(current);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar colaborador");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (data) => {
    try {
      await base44.entities.Employee.update(employee.id, data);
      await loadEmployee();
      toast.success("Colaborador atualizado!");
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

  if (!employee) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate(createPageUrl("Colaboradores"))}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{employee.full_name}</h1>
              <p className="text-lg text-gray-600 mt-1">{employee.position}</p>
              <div className="flex gap-2 mt-2">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                  {employee.area || "Não definido"}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm ${
                  employee.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {employee.status}
                </span>
                {employee.cdc_completed && (
                  <span className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    CDC Completo
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Engajamento</p>
              <p className="text-2xl font-bold text-blue-600">{employee.engagement_score || 0}%</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="dados" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-9 bg-white shadow-md">
            <TabsTrigger value="dados">
              <User className="w-4 h-4 mr-2" />
              Dados
            </TabsTrigger>
            <TabsTrigger value="remuneracao">
              <TrendingUp className="w-4 h-4 mr-2" />
              Produção
            </TabsTrigger>
            <TabsTrigger value="coex-cdc">
              <Heart className="w-4 h-4 mr-2" />
              CDC/COEX
            </TabsTrigger>
            <TabsTrigger value="desempenho">
              <Activity className="w-4 h-4 mr-2" />
              Desempenho
            </TabsTrigger>
            <TabsTrigger value="feedbacks">
              <MessageSquare className="w-4 h-4 mr-2" />
              Feedbacks
            </TabsTrigger>
            <TabsTrigger value="advertencias">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Advertências
            </TabsTrigger>
            <TabsTrigger value="diagnosticos">
              <Award className="w-4 h-4 mr-2" />
              Testes
            </TabsTrigger>
            <TabsTrigger value="documentos">
              <FileText className="w-4 h-4 mr-2" />
              Documentos
            </TabsTrigger>
            <TabsTrigger value="producao">
              <FileCheck className="w-4 h-4 mr-2" />
              Painel
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dados">
            <DadosPessoais employee={employee} onUpdate={handleUpdate} />
          </TabsContent>

          <TabsContent value="remuneracao">
            <RemuneracaoProducao employee={employee} onUpdate={handleUpdate} />
          </TabsContent>

          <TabsContent value="coex-cdc">
            <COEXCDCIntegration employee={employee} />
          </TabsContent>

          <TabsContent value="desempenho">
            <PerformanceMonitoring employee={employee} />
          </TabsContent>

          <TabsContent value="feedbacks">
            <FeedbacksSection employee={employee} onUpdate={handleUpdate} />
          </TabsContent>

          <TabsContent value="advertencias">
            <AdvertenciasSection employee={employee} onUpdate={handleUpdate} />
          </TabsContent>

          <TabsContent value="diagnosticos">
            <DiagnosticosVinculados employee={employee} />
          </TabsContent>

          <TabsContent value="documentos">
            <DocumentosAnexos employee={employee} onUpdate={handleUpdate} />
          </TabsContent>

          <TabsContent value="producao">
            <PainelProducao employee={employee} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}