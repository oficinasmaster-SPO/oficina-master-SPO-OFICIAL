import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, User, FileText, MessageSquare, AlertTriangle, Award, TrendingUp, FileCheck, Heart, Activity, GraduationCap, BarChart3, Rocket, Target, Shield, BookOpen } from "lucide-react";
import { toast } from "sonner";
import DadosPessoais from "../components/employee/DadosPessoais";
import RemuneracaoProducao from "../components/employee/RemuneracaoProducao";
import FeedbacksSection from "../components/employee/FeedbacksSection";
import AdvertenciasSection from "../components/employee/AdvertenciasSection";
import DiagnosticosVinculados from "../components/employee/DiagnosticosVinculados";
import DocumentosAnexos from "../components/employee/DocumentosAnexos";
import DocumentsTab from "@/components/profile/DocumentsTab";
import HistoricoDiarioProducao from "../components/employee/HistoricoDiarioProducao";
import COEXCDCIntegration from "../components/rh/COEXCDCIntegration";
import PerformanceMonitoring from "../components/rh/PerformanceMonitoring";
import EngajamentoCursos from "../components/employee/EngajamentoCursos";
import EvolucaoMaturidade from "../components/employee/EvolucaoMaturidade";
import ContratoTrabalho from "../components/employee/ContratoTrabalho";
import AI_PDI_Generator from "../components/rh/AI_PDI_Generator";
import EmployeeGoals from "../components/employee/EmployeeGoals";
import PermissoesColaborador from "../components/employee/PermissoesColaborador";

export default function MeuPerfil() {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState(null);
  const [user, setUser] = useState(null);
  const [assistanceMode, setAssistanceMode] = useState(false);

  useEffect(() => {
    loadMyProfile();
  }, [location.search]);

  const loadMyProfile = async () => {
    try {
      // Verificar modo assistência
      const params = new URLSearchParams(window.location.search);
      const isAssisting = params.get('assistance_mode') === 'true';
      const workshopId = params.get('workshop_id');
      
      setAssistanceMode(isAssisting && !!workshopId);
      
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      if (!currentUser) {
        toast.error("Usuário não autenticado");
        base44.auth.redirectToLogin();
        return;
      }

      // Se em modo assistência, buscar employee do cliente (workshop assistido)
      let employees = [];
      if (isAssisting && workshopId) {
        employees = await base44.entities.Employee.filter({ 
          workshop_id: workshopId,
          tipo_vinculo: 'cliente'
        });
      } else {
        // Caso contrário, buscar employee do usuário logado
        employees = await base44.entities.Employee.filter({ user_id: currentUser.id });
      }
      
      if (employees && employees.length > 0) {
        setEmployee(employees[0]);
      } else if (!isAssisting) {
        // Só criar automaticamente se NÃO estiver em modo assistência
        try {
          // Buscar oficina do usuário
          let userWorkshop = null;
          const ownedWorkshops = await base44.entities.Workshop.filter({ owner_id: currentUser.id });
          
          if (ownedWorkshops && ownedWorkshops.length > 0) {
            userWorkshop = ownedWorkshops[0];
          } else if (currentUser.workshop_id) {
            userWorkshop = await base44.entities.Workshop.get(currentUser.workshop_id);
          }

          if (userWorkshop) {
            const newEmployee = await base44.entities.Employee.create({
              workshop_id: userWorkshop.id,
              owner_id: userWorkshop.owner_id || currentUser.id,
              user_id: currentUser.id,
              full_name: currentUser.full_name || currentUser.email,
              email: currentUser.email,
              position: "Colaborador",
              job_role: "outros",
              area: "administrativo",
              tipo_vinculo: 'cliente',
              status: 'ativo',
              user_status: 'ativo',
              hire_date: new Date().toISOString().split('T')[0]
            });
            setEmployee(newEmployee);
            toast.success("Perfil criado! Complete seus dados.");
          } else {
            toast.error("Oficina não encontrada. Complete o cadastro primeiro.");
          }
        } catch (createError) {
          console.error("Erro ao criar Employee:", createError);
          toast.error("Erro ao criar perfil");
        }
      } else {
        toast.error("Nenhum colaborador encontrado nesta oficina");
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar perfil");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (data) => {
    try {
      console.log("🔄 Atualizando Employee ID:", employee.id);
      console.log("📝 Dados para atualizar:", data);
      
      await base44.entities.Employee.update(employee.id, data);
      await loadMyProfile();
      toast.success("Perfil atualizado!");
    } catch (error) {
      console.error("❌ Erro ao atualizar Employee:", error);
      toast.error(`Erro ao atualizar: ${error?.message || 'Erro desconhecido'}`);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Você ainda não possui um perfil de colaborador cadastrado.</p>
          <Button onClick={() => window.location.href = createPageUrl("Home")}>
            Voltar ao Início
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
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
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-12 bg-white shadow-md">
            <TabsTrigger value="dados">
              <User className="w-4 h-4 mr-2" />
              Dados
            </TabsTrigger>
            <TabsTrigger value="permissoes" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">
              <Shield className="w-4 h-4 mr-2" />
              Permissões
            </TabsTrigger>
            <TabsTrigger value="documentos_empresa" className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700">
              <BookOpen className="w-4 h-4 mr-2" />
              Regimento
            </TabsTrigger>
            <TabsTrigger value="remuneracao">
              <TrendingUp className="w-4 h-4 mr-2" />
              Produção
            </TabsTrigger>
            <TabsTrigger value="metas" className="data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700">
              <Target className="w-4 h-4 mr-2" />
              Metas
            </TabsTrigger>
            <TabsTrigger value="engajamento">
              <GraduationCap className="w-4 h-4 mr-2" />
              Cursos
            </TabsTrigger>
            <TabsTrigger value="contrato">
              <FileText className="w-4 h-4 mr-2" />
              Contrato
            </TabsTrigger>
            <TabsTrigger value="coex-cdc">
              <Heart className="w-4 h-4 mr-2" />
              CDC/COEX
            </TabsTrigger>
            <TabsTrigger value="desempenho">
              <Activity className="w-4 h-4 mr-2" />
              Desempenho
            </TabsTrigger>
            <TabsTrigger value="evolucao">
              <BarChart3 className="w-4 h-4 mr-2" />
              Evolução
            </TabsTrigger>
            <TabsTrigger value="feedbacks">
              <MessageSquare className="w-4 h-4 mr-2" />
              Feedbacks
            </TabsTrigger>
            <TabsTrigger value="advertencias">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Alertas
            </TabsTrigger>
            <TabsTrigger value="diagnosticos">
              <Award className="w-4 h-4 mr-2" />
              Testes
            </TabsTrigger>
            <TabsTrigger value="documentos">
              <FileCheck className="w-4 h-4 mr-2" />
              Anexos
            </TabsTrigger>
            <TabsTrigger value="pdi" className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700">
              <Rocket className="w-4 h-4 mr-2" />
              PDI (IA)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dados">
            <DadosPessoais employee={employee} onUpdate={handleUpdate} />
          </TabsContent>

          <TabsContent value="permissoes">
            <PermissoesColaborador employee={employee} />
          </TabsContent>

          <TabsContent value="remuneracao">
            <RemuneracaoProducao employee={employee} onUpdate={handleUpdate} />
            <div className="mt-6">
              <HistoricoDiarioProducao employee={employee} onUpdate={handleUpdate} />
            </div>
          </TabsContent>

          <TabsContent value="metas">
            <EmployeeGoals employee={employee} onUpdate={handleUpdate} />
          </TabsContent>

          <TabsContent value="documentos_empresa">
            <DocumentsTab employee={employee} />
          </TabsContent>

          <TabsContent value="engajamento">
            <EngajamentoCursos employee={employee} onUpdate={handleUpdate} />
          </TabsContent>

          <TabsContent value="contrato">
            <ContratoTrabalho employee={employee} onUpdate={handleUpdate} />
          </TabsContent>

          <TabsContent value="coex-cdc">
            <COEXCDCIntegration employee={employee} />
          </TabsContent>

          <TabsContent value="desempenho">
            <PerformanceMonitoring employee={employee} />
          </TabsContent>

          <TabsContent value="evolucao">
            <EvolucaoMaturidade employee={employee} />
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

          <TabsContent value="pdi">
            <AI_PDI_Generator employee={employee} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}