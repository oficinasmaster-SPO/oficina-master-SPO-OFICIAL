import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import DashboardKPIs from "./DashboardKPIs";
import StatusClientesCards from "./StatusClientesCards";
import ClientesStatusModal from "./ClientesStatusModal";
import ProximosAtendimentos from "./ProximosAtendimentos";

export default function VisaoGeralTab({ user }) {
  const [modalStatus, setModalStatus] = useState(null);
  const [selectedClientes, setSelectedClientes] = useState([]);

  // Carregar workshops ativos
  const { data: workshops = [] } = useQuery({
    queryKey: ['workshops-aceleracao'],
    queryFn: async () => {
      const all = await base44.entities.Workshop.list();
      return all.filter(w => w.planoAtual && w.planoAtual !== 'FREE');
    }
  });

  // Carregar atendimentos
  const { data: atendimentos = [], isLoading: loadingAtendimentos } = useQuery({
    queryKey: ['atendimentos-acelerador', user?.id],
    queryFn: async () => {
      if (user.role === 'admin') {
        return await base44.entities.ConsultoriaAtendimento.list('-data_agendada');
      }
      return await base44.entities.ConsultoriaAtendimento.filter(
        { consultor_id: user.id },
        '-data_agendada'
      );
    },
    enabled: !!user
  });

  // Carregar planos
  const { data: planos = [] } = useQuery({
    queryKey: ['planos-acelerador', user?.id],
    queryFn: async () => {
      if (user.role === 'admin') {
        return await base44.entities.Plan.list();
      }
      return await base44.entities.Plan.filter({ consultant_id: user.id });
    },
    enabled: !!user
  });

  // Calcular KPIs
  const clientesAtivos = workshops.length;
  
  const horasContratadas = planos.reduce((sum, p) => sum + (p.hours_contracted || 0), 0);
  const horasRealizadas = planos.reduce((sum, p) => sum + (p.hours_used || 0), 0);
  const horasDisponiveis = Math.max(0, horasContratadas - horasRealizadas);

  const reunioesRealizadas = atendimentos.filter(a => a.status === 'realizado').length;
  const proximasReunioes = atendimentos.filter(a => 
    ['agendado', 'confirmado'].includes(a.status)
  ).length;
  const reunioesCanceladas = atendimentos.filter(a => a.status === 'cancelado').length;

  // Calcular status dos clientes
  const clientesPorStatus = workshops.reduce((acc, workshop) => {
    const atendimentosWorkshop = atendimentos.filter(a => a.workshop_id === workshop.id);
    const ultimoAtendimento = atendimentosWorkshop.length > 0 
      ? atendimentosWorkshop[0] 
      : null;
    
    const status = ultimoAtendimento?.status_cliente || 'estagnado';
    
    if (!acc[status]) acc[status] = [];
    acc[status].push({
      workshop_id: workshop.id,
      workshop_name: workshop.name,
      workshop_cidade: workshop.city,
      workshop_estado: workshop.state,
      plano: workshop.planoAtual,
      ultimo_atendimento: ultimoAtendimento?.data_realizada || null,
      consultor_nome: ultimoAtendimento?.consultor_nome || 'Não atribuído'
    });
    
    return acc;
  }, {});

  const crescendo = clientesPorStatus.crescente?.length || 0;
  const decrescendo = clientesPorStatus.decrescente?.length || 0;
  const estagnados = clientesPorStatus.estagnado?.length || 0;
  const naoRespondem = clientesPorStatus.nao_responde?.length || 0;

  // Próximos 5 atendimentos
  const proximosAtendimentosLista = atendimentos
    .filter(a => ['agendado', 'confirmado'].includes(a.status))
    .slice(0, 5)
    .map(a => {
      const workshop = workshops.find(w => w.id === a.workshop_id);
      return {
        ...a,
        workshop_name: workshop?.name || 'Cliente'
      };
    });

  const handleViewDetails = (status) => {
    setModalStatus(status);
    setSelectedClientes(clientesPorStatus[status] || []);
  };

  return (
    <div className="space-y-6">
      <DashboardKPIs
        clientesAtivos={clientesAtivos}
        horasDisponiveis={horasDisponiveis}
        reunioesRealizadas={reunioesRealizadas}
        proximasReunioes={proximasReunioes}
        reunioesCanceladas={reunioesCanceladas}
        loading={loadingAtendimentos}
      />

      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Status dos Clientes</h2>
        <StatusClientesCards
          crescendo={crescendo}
          decrescendo={decrescendo}
          estagnados={estagnados}
          naoRespondem={naoRespondem}
          loading={loadingAtendimentos}
          onViewDetails={handleViewDetails}
        />
      </div>

      <ProximosAtendimentos
        atendimentos={proximosAtendimentosLista}
        loading={loadingAtendimentos}
      />

      {modalStatus && (
        <ClientesStatusModal
          clientes={selectedClientes}
          status={modalStatus}
          onClose={() => {
            setModalStatus(null);
            setSelectedClientes([]);
          }}
        />
      )}
    </div>
  );
}