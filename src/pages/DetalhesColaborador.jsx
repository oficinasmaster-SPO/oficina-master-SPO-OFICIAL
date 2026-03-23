import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ArrowLeft, User, FileText, MessageSquare, AlertTriangle, Award, TrendingUp, FileCheck, Heart, FilePenLine, Activity, GraduationCap, BarChart3, Rocket, Target, Trash2, UserX, Shield, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import DadosPessoais from "../components/employee/DadosPessoais";
import RemuneracaoProducao from "../components/employee/RemuneracaoProducao";
import FeedbacksSection from "../components/employee/FeedbacksSection";
import AdvertenciasSection from "../components/employee/AdvertenciasSection";
import DiagnosticosVinculados from "../components/employee/DiagnosticosVinculados";
import DocumentosAnexos from "../components/employee/DocumentosAnexos";
import HistoricoDiarioProducao from "../components/employee/HistoricoDiarioProducao";
import COEXCDCIntegration from "../components/rh/COEXCDCIntegration";
import PerformanceMonitoring from "../components/rh/PerformanceMonitoring";
import EngajamentoCursos from "../components/employee/EngajamentoCursos";
import EvolucaoMaturidade from "../components/employee/EvolucaoMaturidade";
import ContratoTrabalho from "../components/employee/ContratoTrabalho";
import AI_PDI_Generator from "../components/rh/AI_PDI_Generator";
import EmployeeGoals from "../components/employee/EmployeeGoals";
import PermissoesColaborador from "../components/employee/PermissoesColaborador";
import PainelProducao from "../components/employee/PainelProducao";

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
    <div className="min-h-screen bg-[#F8FAFC] py-8 px-4 md:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate(createPageUrl("Colaboradores"))} className="bg-white hover:bg-slate-50 border-slate-200 shadow-[0_4px_12px_rgba(0,0,0,0.03)] rounded-xl transition-all hover:scale-[1.02] duration-200">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={async () => {
                if (confirm(`Tem certeza que deseja ${employee.status === 'ativo' ? 'inativar' : 'ativar'} este colaborador?`)) {
                  await handleUpdate({ status: employee.status === 'ativo' ? 'inativo' : 'ativo' });
                }
              }}
              className={`bg-white shadow-[0_4px_12px_rgba(0,0,0,0.03)] rounded-xl transition-all hover:scale-[1.02] duration-200 ${employee.status === 'ativo' ? 'text-orange-600 border-orange-200 hover:bg-orange-50' : 'text-green-600 border-green-200 hover:bg-green-50'}`}
            >
              {employee.status === 'ativo' ? 'Inativar' : 'Ativar'}
            </Button>
            <Button 
              variant="destructive"
              className="rounded-xl shadow-[0_4px_12px_rgba(239,68,68,0.2)] transition-all hover:scale-[1.02] duration-200"
              onClick={async () => {
                if (confirm(`Tem certeza que deseja EXCLUIR permanentemente ${employee.full_name}? Esta ação não pode ser desfeita.`)) {
                  try {
                    await base44.entities.Employee.delete(employee.id);
                    toast.success("Colaborador excluído");
                    navigate(createPageUrl("Colaboradores"));
                  } catch (error) {
                    toast.error("Erro ao excluir colaborador");
                  }
                }
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </Button>
          </div>
        </div>

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
                <FileText className="w-4 h-4 mr-2" />
                Docs
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

          <TabsContent value="remuneracao" className="animate-in fade-in slide-in-from-bottom-4 duration-500 mt-2">
            <PainelProducao employee={employee} />
            <div className="mt-6">
              <RemuneracaoProducao employee={employee} onUpdate={handleUpdate} />
            </div>
            <div className="mt-6">
              <HistoricoDiarioProducao employee={employee} onUpdate={handleUpdate} />
            </div>
          </TabsContent>

          <TabsContent value="metas" className="animate-in fade-in slide-in-from-bottom-4 duration-500 mt-2">
            <EmployeeGoals employee={employee} onUpdate={handleUpdate} />
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