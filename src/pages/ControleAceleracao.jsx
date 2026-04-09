import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, BarChart3, Calendar, FileText, ClipboardList, Users, Activity } from "lucide-react";
import VisaoGeralTab from "@/components/aceleracao/VisaoGeralTab";
import PainelAtendimentosTab from "@/components/aceleracao/PainelAtendimentosTab";
import PedidosInternosTab from "@/components/aceleracao/PedidosInternosTab";
import AgendaVisualTab from "@/components/aceleracao/AgendaVisualTab";
import RegistroAtendimentoMassaModal from "@/components/aceleracao/RegistroAtendimentoMassaModal";
import FiltrosControleAceleracao from "@/components/aceleracao/FiltrosControleAceleracao";
import RegistrarAtendimento from "./RegistrarAtendimento";
import CronogramaGeral from "./CronogramaGeral";
import DashboardOperacionalTabRedesigned from "@/components/aceleracao/DashboardOperacionalTabRedesigned";

// ControleAceleracao v6 - cache bust force reload
export default function ControleAceleracao() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get('tab') === 'consultoria' ? 'dashboard-operacional' : (urlParams.get('tab') || "visao-geral");
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showMassRegistration, setShowMassRegistration] = useState(false);
  const [filtros, setFiltros] = useState({
    consultorId: "todos",
    preset: "mes_atual",
    dataInicio: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    dataFim: format(endOfMonth(new Date()), "yyyy-MM-dd")
  });

  const { data: user, isLoading: loadingUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: consultores } = useQuery({
    queryKey: ['consultores-list'],
    queryFn: async () => {
      // consultoresMap: chave = User ID, valor = nome
      const consultoresMap = new Map();

      // Fonte 1: Employees internos → sempre usa user_id como chave
      let employeeIdToUserId = new Map(); // employee.id → employee.user_id
      try {
        const employees = await base44.entities.Employee.filter({
          tipo_vinculo: 'interno',
          status: 'ativo'
        }, null, 1000);
        employees.filter(e => e.user_id).forEach(e => {
          consultoresMap.set(e.user_id, e.full_name);
          employeeIdToUserId.set(e.id, e.user_id);
        });
      } catch (e) {
        console.warn('Erro ao buscar employees internos:', e);
      }

      // Fonte 2: Consultores dos atendimentos existentes
      // Resolver Employee IDs → User IDs usando o mapa da Fonte 1
      try {
        const atendimentos = await base44.entities.ConsultoriaAtendimento.filter({}, null, 5000);
        atendimentos.forEach(a => {
          if (a.consultor_id && a.consultor_nome) {
            // Se o consultor_id é um Employee ID, converter para User ID
            const resolvedUserId = employeeIdToUserId.get(a.consultor_id) || a.consultor_id;
            if (!consultoresMap.has(resolvedUserId)) {
              consultoresMap.set(resolvedUserId, a.consultor_nome);
            }
          }
        });
      } catch (e) {
        console.warn('Erro ao buscar consultores dos atendimentos:', e);
      }

      // Fonte 3: Usuário logado (sempre incluir)
      const me = await base44.auth.me();
      if (me?.id) {
        consultoresMap.set(me.id, me.full_name);
      }

      return Array.from(consultoresMap.entries()).map(([id, full_name]) => ({
        id,
        full_name
      }));
    },
    enabled: !!user
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

  const isModalOpen = urlParams.get('modal') === 'atendimento';

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {isModalOpen && (
        <RegistrarAtendimento 
          isModal={true}
          consultoresExternos={consultores}
          onClose={() => {
            const newUrl = new URL(window.location);
            newUrl.searchParams.delete('modal');
            newUrl.searchParams.delete('edit');
            newUrl.searchParams.delete('atendimento_id');
            navigate(newUrl.pathname + newUrl.search, { replace: true });
          }} 
        />
      )}
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
            onClick={() => navigate(`${createPageUrl('ControleAceleracao')}?tab=${activeTab}&modal=atendimento`)}
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
        <TabsList className="flex w-full justify-start overflow-x-auto bg-white shadow-md h-auto p-1 gap-1">
          <TabsTrigger value="visao-geral" className="flex-shrink-0 data-[state=active]:bg-[#FF0000] data-[state=active]:text-white hover:bg-[#FF0000] hover:text-white transition-colors">
            <BarChart3 className="w-4 h-4 mr-2" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="atendimentos" className="flex-shrink-0 data-[state=active]:bg-[#FF0000] data-[state=active]:text-white hover:bg-[#FF0000] hover:text-white transition-colors">
            <ClipboardList className="w-4 h-4 mr-2" />
            Atendimentos
          </TabsTrigger>
          <TabsTrigger 
            value="cronograma"
            className="flex-shrink-0 data-[state=active]:bg-[#FF0000] data-[state=active]:text-white hover:bg-[#FF0000] hover:text-white transition-colors"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Cronograma Geral
          </TabsTrigger>
          <TabsTrigger value="pedidos" className="flex-shrink-0 data-[state=active]:bg-[#FF0000] data-[state=active]:text-white hover:bg-[#FF0000] hover:text-white transition-colors">
            <FileText className="w-4 h-4 mr-2" />
            Pedidos & Backlog
          </TabsTrigger>
          <TabsTrigger value="agenda-visual" className="flex-shrink-0 data-[state=active]:bg-[#FF0000] data-[state=active]:text-white hover:bg-[#FF0000] hover:text-white transition-colors">
            <Calendar className="w-4 h-4 mr-2" />
            Agenda Visual
          </TabsTrigger>
          <TabsTrigger value="dashboard-operacional" className="flex-shrink-0 data-[state=active]:bg-[#FF0000] data-[state=active]:text-white hover:bg-[#FF0000] hover:text-white transition-colors">
            <Activity className="w-4 h-4 mr-2" />
            Dashboard Sprints
          </TabsTrigger>
            </TabsList>

        <TabsContent value="visao-geral">
          <FiltrosControleAceleracao
            consultores={consultores || []}
            filtros={filtros}
            onFiltrosChange={setFiltros}
          />
          <VisaoGeralTab user={user} filtros={filtros} />
        </TabsContent>

        <TabsContent value="atendimentos">
          <PainelAtendimentosTab user={user} />
        </TabsContent>

        <TabsContent value="cronograma">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <CronogramaGeral isTab={true} />
          </div>
        </TabsContent>

        <TabsContent value="pedidos">
          <PedidosInternosTab user={user} />
        </TabsContent>

        <TabsContent value="agenda-visual">
          <FiltrosControleAceleracao
            consultores={consultores || []}
            filtros={filtros}
            onFiltrosChange={setFiltros}
          />
          <AgendaVisualTab user={user} filtros={filtros} />
        </TabsContent>

        <TabsContent value="dashboard-operacional">
          <DashboardOperacionalTabRedesigned user={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
}