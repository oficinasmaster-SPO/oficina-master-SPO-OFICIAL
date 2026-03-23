import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, User, FileText, MessageSquare, AlertTriangle, Award, TrendingUp, FileCheck, Heart, Activity, GraduationCap, BarChart3, Rocket, Target, Shield, BookOpen, CheckCircle2, XCircle } from "lucide-react";
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
import JobDescriptionTab from "../components/employee/JobDescriptionTab";

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
      // Verificar modo assistência ou onboarding
      const params = new URLSearchParams(window.location.search);
      const isAssisting = params.get('assistance_mode') === 'true';
      const isOnboarding = params.get('onboarding') === 'true';
      const inviteToken = params.get('invite_token');
      const workshopId = params.get('workshop_id');
      
      setAssistanceMode(isAssisting && !!workshopId);
      
      // Se é onboarding com token, processar convite primeiro
      if (isOnboarding && inviteToken) {
        try {
          const tokenResponse = await base44.functions.invoke('validateInviteToken', { token: inviteToken });
          if (tokenResponse.data.success) {
            // Validar e criar conta
            const createResponse = await base44.functions.invoke('createUserOnFirstAccess', {
              invite_id: tokenResponse.data.invite.id,
              password: 'temp' // Será definido depois
            });

            if (createResponse.data.success) {
              console.log("✅ Onboarding concluído com sucesso. Recarregando aplicação para atualizar permissões...");
              toast.success("Perfil configurado com sucesso! Atualizando sistema...", { duration: 3000 });

              // Aguardar brevemente para o usuário ver a mensagem e então recarregar
              // Isso garante que o Layout e a Sidebar recebam os novos dados (profile_id e workshop_id)
              setTimeout(() => {
                window.location.reload();
              }, 1500);

              // Interromper o fluxo para evitar renderização com estado antigo
              return;
            }
          }
        } catch (err) {
          console.error("Erro ao processar onboarding:", err);
          toast.error("Erro ao processar seu convite");
        }
      }

      // Busca usuário (pode ser o atualizado acima ou o da sessão atual)
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

        // Fallback: Se não encontrou por ID, tentar por email
        if (!employees || employees.length === 0) {
          console.warn("⚠️ Employee não encontrado por ID, tentando por email:", currentUser.email);
          employees = await base44.entities.Employee.filter({ email: currentUser.email });
        }

        // Tentar recuperação via Backend (Service Role) se ainda não encontrou ou para garantir vínculo
        // Isso resolve problemas de permissão RLS onde o usuário não pode ver/editar o Employee ainda
        if (!employees || employees.length === 0 || (employees[0] && !employees[0].user_id)) {
           console.log("🔄 Tentando vincular via backend function...");
           try {
             const linkResponse = await base44.functions.invoke('linkUserToEmployee');
             if (linkResponse.data && linkResponse.data.success) {
                console.log("✅ Vínculo realizado via backend!", linkResponse.data);
                
                // Aguardar propagação do RLS
                await new Promise(r => setTimeout(r, 500));

                // Usar o objeto retornado pelo backend se disponível (evita 404 por RLS)
                if (linkResponse.data.employee) {
                    console.log("✅ Usando dados do employee retornados pelo backend");
                    employees = [linkResponse.data.employee];
                    // Atualizar usuário localmente se workshop mudou
                    if (linkResponse.data.workshop_id && user.workshop_id !== linkResponse.data.workshop_id) {
                        setUser(prev => ({ ...prev, workshop_id: linkResponse.data.workshop_id }));
                    }
                } 
                // Fallback: Tentar buscar via API se o backend não retornou o objeto completo
                else if (linkResponse.data.employee_id) {
                   try {
                     const freshEmployee = await base44.entities.Employee.get(linkResponse.data.employee_id);
                     if (freshEmployee) {
                        employees = [freshEmployee];
                        if (linkResponse.data.workshop_id && user.workshop_id !== linkResponse.data.workshop_id) {
                            setUser(prev => ({ ...prev, workshop_id: linkResponse.data.workshop_id }));
                        }
                     }
                   } catch (getError) {
                     console.warn("⚠️ Ainda não foi possível ler o employee via API direta (RLS delay?).", getError);
                     // Não forçar reload imediatamente, deixar o usuário ver o erro ou tentar novamente
                   }
                }
             }
           } catch (e) {
             console.warn("⚠️ Falha ao tentar vincular via backend:", e);
           }
        }
      }
      
      if (employees && employees.length > 0) {
        setEmployee(employees[0]);
      } else if (!isAssisting) {
        // Employee será criado automaticamente pela automação quando EmployeeInviteAcceptance for criado
        // Se ainda assim não existir, é porque o usuário não foi convidado corretamente
        console.warn("Employee não encontrado para usuário:", currentUser.id);
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
        <div className="text-center space-y-4">
          <p className="text-gray-600 mb-4">Você ainda não possui um perfil de colaborador cadastrado.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              className="bg-black text-white hover:bg-gray-800"
              onClick={() => window.location.href = "https://oficinasmastergtr.com/cadastro"}
            >
              Voltar ao Início
            </Button>
            <Button 
              className="bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => window.location.href = "https://oficinasmastergtr.com/cadastro"}
            >
              Fazer diagnóstico agora
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-8 px-4 md:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] rounded-[16px] shadow-[0_12px_24px_rgba(0,0,0,0.15)] p-6 md:p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8 relative z-10">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 w-full md:w-auto">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-3xl font-bold shadow-[0_4px_16px_rgba(59,130,246,0.4)] flex-shrink-0 border-4 border-slate-800">
                {employee.full_name?.substring(0, 2).toUpperCase() || "U"}
              </div>
              
              <div className="text-center md:text-left flex flex-col justify-center h-full pt-1">
                <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">{employee.full_name}</h1>
                <p className="text-slate-300 mt-2 font-medium text-lg flex items-center justify-center md:justify-start gap-2">
                  <User className="w-5 h-5 opacity-70" />
                  {employee.position || "Cargo não definido"}
                </p>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-4">
                  <span className="px-4 py-1.5 bg-blue-500/15 text-blue-400 rounded-full text-sm font-semibold flex items-center gap-1.5 border border-blue-500/20">
                    <Award className="w-4 h-4" />
                    {employee.area || "Não definido"}
                  </span>
                  <span className={`px-4 py-1.5 rounded-full text-sm font-semibold flex items-center gap-1.5 border ${
                    employee.status === 'ativo' ? 'bg-green-500/15 text-green-400 border-green-500/20' : 'bg-slate-500/15 text-slate-300 border-slate-500/20'
                  }`}>
                    {employee.status === 'ativo' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    {employee.status || "Desconhecido"}
                  </span>
                  {employee.cdc_completed && (
                    <span className="px-4 py-1.5 bg-pink-500/15 text-pink-400 rounded-full text-sm font-semibold flex items-center gap-1.5 border border-pink-500/20">
                      <Heart className="w-4 h-4" />
                      CDC Completo
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="w-full md:w-auto bg-slate-800/50 rounded-2xl p-5 backdrop-blur-md border border-slate-700 min-w-[240px]">
              <div className="flex justify-between items-end mb-3">
                <p className="text-sm text-slate-400 font-semibold uppercase tracking-wider">Engajamento</p>
                <p className="text-3xl font-bold text-white leading-none">{employee.engagement_score || 0}%</p>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden shadow-inner">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${
                    (employee.engagement_score || 0) >= 80 ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 
                    (employee.engagement_score || 0) >= 50 ? 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                  }`}
                  style={{ width: `${employee.engagement_score || 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="dados" className="space-y-8">
          <div className="bg-white rounded-[16px] shadow-[0_8px_20px_rgba(0,0,0,0.06)] p-2 border border-slate-100 overflow-hidden">
            <TabsList className="flex w-full overflow-x-auto bg-transparent p-0 gap-2 justify-start h-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <TabsTrigger value="dados" className="data-[state=active]:bg-[#EF4444] data-[state=active]:text-white data-[state=active]:shadow-[0_4px_12px_rgba(239,68,68,0.3)] bg-transparent hover:bg-slate-50 transition-all duration-200 ease-in-out rounded-xl px-4 py-3 text-sm font-medium whitespace-nowrap flex-shrink-0 cursor-pointer hover:scale-[1.02]">
                <User className="w-4 h-4 mr-2" />
                Dados
              </TabsTrigger>
              <TabsTrigger value="permissoes" className="data-[state=active]:bg-[#EF4444] data-[state=active]:text-white data-[state=active]:shadow-[0_4px_12px_rgba(239,68,68,0.3)] bg-transparent hover:bg-slate-50 transition-all duration-200 ease-in-out rounded-xl px-4 py-3 text-sm font-medium whitespace-nowrap flex-shrink-0 cursor-pointer hover:scale-[1.02]">
                <Shield className="w-4 h-4 mr-2" />
                Permissões
              </TabsTrigger>
              <TabsTrigger value="descricao_cargo" className="data-[state=active]:bg-[#EF4444] data-[state=active]:text-white data-[state=active]:shadow-[0_4px_12px_rgba(239,68,68,0.3)] bg-transparent hover:bg-slate-50 transition-all duration-200 ease-in-out rounded-xl px-4 py-3 text-sm font-medium whitespace-nowrap flex-shrink-0 cursor-pointer hover:scale-[1.02]">
                <FileText className="w-4 h-4 mr-2" />
                Cargo (DC)
              </TabsTrigger>
              <TabsTrigger value="documentos_empresa" className="data-[state=active]:bg-[#EF4444] data-[state=active]:text-white data-[state=active]:shadow-[0_4px_12px_rgba(239,68,68,0.3)] bg-transparent hover:bg-slate-50 transition-all duration-200 ease-in-out rounded-xl px-4 py-3 text-sm font-medium whitespace-nowrap flex-shrink-0 cursor-pointer hover:scale-[1.02]">
                <BookOpen className="w-4 h-4 mr-2" />
                Regimento
              </TabsTrigger>
              <TabsTrigger value="remuneracao" className="data-[state=active]:bg-[#EF4444] data-[state=active]:text-white data-[state=active]:shadow-[0_4px_12px_rgba(239,68,68,0.3)] bg-transparent hover:bg-slate-50 transition-all duration-200 ease-in-out rounded-xl px-4 py-3 text-sm font-medium whitespace-nowrap flex-shrink-0 cursor-pointer hover:scale-[1.02]">
                <TrendingUp className="w-4 h-4 mr-2" />
                Produção
              </TabsTrigger>
              <TabsTrigger value="metas" className="data-[state=active]:bg-[#EF4444] data-[state=active]:text-white data-[state=active]:shadow-[0_4px_12px_rgba(239,68,68,0.3)] bg-transparent hover:bg-slate-50 transition-all duration-200 ease-in-out rounded-xl px-4 py-3 text-sm font-medium whitespace-nowrap flex-shrink-0 cursor-pointer hover:scale-[1.02]">
                <Target className="w-4 h-4 mr-2" />
                Metas
              </TabsTrigger>
              <TabsTrigger value="engajamento" className="data-[state=active]:bg-[#EF4444] data-[state=active]:text-white data-[state=active]:shadow-[0_4px_12px_rgba(239,68,68,0.3)] bg-transparent hover:bg-slate-50 transition-all duration-200 ease-in-out rounded-xl px-4 py-3 text-sm font-medium whitespace-nowrap flex-shrink-0 cursor-pointer hover:scale-[1.02]">
                <GraduationCap className="w-4 h-4 mr-2" />
                Cursos
              </TabsTrigger>
              <TabsTrigger value="contrato" className="data-[state=active]:bg-[#EF4444] data-[state=active]:text-white data-[state=active]:shadow-[0_4px_12px_rgba(239,68,68,0.3)] bg-transparent hover:bg-slate-50 transition-all duration-200 ease-in-out rounded-xl px-4 py-3 text-sm font-medium whitespace-nowrap flex-shrink-0 cursor-pointer hover:scale-[1.02]">
                <FileText className="w-4 h-4 mr-2" />
                Contrato
              </TabsTrigger>
              <TabsTrigger value="coex-cdc" className="data-[state=active]:bg-[#EF4444] data-[state=active]:text-white data-[state=active]:shadow-[0_4px_12px_rgba(239,68,68,0.3)] bg-transparent hover:bg-slate-50 transition-all duration-200 ease-in-out rounded-xl px-4 py-3 text-sm font-medium whitespace-nowrap flex-shrink-0 cursor-pointer hover:scale-[1.02]">
                <Heart className="w-4 h-4 mr-2" />
                CDC/COEX
              </TabsTrigger>
              <TabsTrigger value="desempenho" className="data-[state=active]:bg-[#EF4444] data-[state=active]:text-white data-[state=active]:shadow-[0_4px_12px_rgba(239,68,68,0.3)] bg-transparent hover:bg-slate-50 transition-all duration-200 ease-in-out rounded-xl px-4 py-3 text-sm font-medium whitespace-nowrap flex-shrink-0 cursor-pointer hover:scale-[1.02]">
                <Activity className="w-4 h-4 mr-2" />
                Desempenho
              </TabsTrigger>
              <TabsTrigger value="evolucao" className="data-[state=active]:bg-[#EF4444] data-[state=active]:text-white data-[state=active]:shadow-[0_4px_12px_rgba(239,68,68,0.3)] bg-transparent hover:bg-slate-50 transition-all duration-200 ease-in-out rounded-xl px-4 py-3 text-sm font-medium whitespace-nowrap flex-shrink-0 cursor-pointer hover:scale-[1.02]">
                <BarChart3 className="w-4 h-4 mr-2" />
                Evolução
              </TabsTrigger>
              <TabsTrigger value="feedbacks" className="data-[state=active]:bg-[#EF4444] data-[state=active]:text-white data-[state=active]:shadow-[0_4px_12px_rgba(239,68,68,0.3)] bg-transparent hover:bg-slate-50 transition-all duration-200 ease-in-out rounded-xl px-4 py-3 text-sm font-medium whitespace-nowrap flex-shrink-0 cursor-pointer hover:scale-[1.02]">
                <MessageSquare className="w-4 h-4 mr-2" />
                Feedbacks
              </TabsTrigger>
              <TabsTrigger value="advertencias" className="data-[state=active]:bg-[#EF4444] data-[state=active]:text-white data-[state=active]:shadow-[0_4px_12px_rgba(239,68,68,0.3)] bg-transparent hover:bg-slate-50 transition-all duration-200 ease-in-out rounded-xl px-4 py-3 text-sm font-medium whitespace-nowrap flex-shrink-0 cursor-pointer hover:scale-[1.02]">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Alertas
              </TabsTrigger>
              <TabsTrigger value="diagnosticos" className="data-[state=active]:bg-[#EF4444] data-[state=active]:text-white data-[state=active]:shadow-[0_4px_12px_rgba(239,68,68,0.3)] bg-transparent hover:bg-slate-50 transition-all duration-200 ease-in-out rounded-xl px-4 py-3 text-sm font-medium whitespace-nowrap flex-shrink-0 cursor-pointer hover:scale-[1.02]">
                <Award className="w-4 h-4 mr-2" />
                Testes
              </TabsTrigger>
              <TabsTrigger value="documentos" className="data-[state=active]:bg-[#EF4444] data-[state=active]:text-white data-[state=active]:shadow-[0_4px_12px_rgba(239,68,68,0.3)] bg-transparent hover:bg-slate-50 transition-all duration-200 ease-in-out rounded-xl px-4 py-3 text-sm font-medium whitespace-nowrap flex-shrink-0 cursor-pointer hover:scale-[1.02]">
                <FileCheck className="w-4 h-4 mr-2" />
                Anexos
              </TabsTrigger>
              <TabsTrigger value="pdi" className="data-[state=active]:bg-[#EF4444] data-[state=active]:text-white data-[state=active]:shadow-[0_4px_12px_rgba(239,68,68,0.3)] bg-transparent hover:bg-slate-50 transition-all duration-200 ease-in-out rounded-xl px-4 py-3 text-sm font-medium whitespace-nowrap flex-shrink-0 cursor-pointer hover:scale-[1.02]">
                <Rocket className="w-4 h-4 mr-2" />
                PDI (IA)
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="dados" className="animate-in fade-in slide-in-from-bottom-4 duration-500 mt-2">
            <DadosPessoais employee={employee} onUpdate={handleUpdate} />
          </TabsContent>

          <TabsContent value="permissoes" className="animate-in fade-in slide-in-from-bottom-4 duration-500 mt-2">
            <PermissoesColaborador employee={employee} />
          </TabsContent>

          <TabsContent value="descricao_cargo" className="animate-in fade-in slide-in-from-bottom-4 duration-500 mt-2">
            <JobDescriptionTab employee={employee} onUpdate={handleUpdate} />
          </TabsContent>

          <TabsContent value="remuneracao" className="animate-in fade-in slide-in-from-bottom-4 duration-500 mt-2">
            <RemuneracaoProducao employee={employee} onUpdate={handleUpdate} />
            <div className="mt-6">
              <HistoricoDiarioProducao employee={employee} onUpdate={handleUpdate} />
            </div>
          </TabsContent>

          <TabsContent value="metas" className="animate-in fade-in slide-in-from-bottom-4 duration-500 mt-2">
            <EmployeeGoals employee={employee} onUpdate={handleUpdate} />
          </TabsContent>

          <TabsContent value="documentos_empresa" className="animate-in fade-in slide-in-from-bottom-4 duration-500 mt-2">
            <DocumentsTab employee={employee} />
          </TabsContent>

          <TabsContent value="engajamento" className="animate-in fade-in slide-in-from-bottom-4 duration-500 mt-2">
            <EngajamentoCursos employee={employee} onUpdate={handleUpdate} />
          </TabsContent>

          <TabsContent value="contrato" className="animate-in fade-in slide-in-from-bottom-4 duration-500 mt-2">
            <ContratoTrabalho employee={employee} onUpdate={handleUpdate} />
          </TabsContent>

          <TabsContent value="coex-cdc" className="animate-in fade-in slide-in-from-bottom-4 duration-500 mt-2">
            <COEXCDCIntegration employee={employee} />
          </TabsContent>

          <TabsContent value="desempenho" className="animate-in fade-in slide-in-from-bottom-4 duration-500 mt-2">
            <PerformanceMonitoring employee={employee} />
          </TabsContent>

          <TabsContent value="evolucao" className="animate-in fade-in slide-in-from-bottom-4 duration-500 mt-2">
            <EvolucaoMaturidade employee={employee} />
          </TabsContent>

          <TabsContent value="feedbacks" className="animate-in fade-in slide-in-from-bottom-4 duration-500 mt-2">
            <FeedbacksSection employee={employee} onUpdate={handleUpdate} />
          </TabsContent>

          <TabsContent value="advertencias" className="animate-in fade-in slide-in-from-bottom-4 duration-500 mt-2">
            <AdvertenciasSection employee={employee} onUpdate={handleUpdate} />
          </TabsContent>

          <TabsContent value="diagnosticos" className="animate-in fade-in slide-in-from-bottom-4 duration-500 mt-2">
            <DiagnosticosVinculados employee={employee} />
          </TabsContent>

          <TabsContent value="documentos" className="animate-in fade-in slide-in-from-bottom-4 duration-500 mt-2">
            <DocumentosAnexos employee={employee} onUpdate={handleUpdate} />
          </TabsContent>

          <TabsContent value="pdi" className="animate-in fade-in slide-in-from-bottom-4 duration-500 mt-2">
            <AI_PDI_Generator employee={employee} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}