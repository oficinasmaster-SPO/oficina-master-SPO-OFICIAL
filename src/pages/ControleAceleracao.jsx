// rebuild trigger v2
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import useControleAceleracaoState from "@/components/hooks/useControleAceleracaoState";
import ControleAceleracaoView from "@/components/aceleracao/ControleAceleracaoView";
import PageAccessControl from "@/components/auth/PageAccessControl";
import WheelLoader from "@/components/ui/WheelLoader";
import SugestaoHorarioPendentePoup from "@/components/aceleracao/SugestaoHorarioPendentePoup";

export default function ControleAceleracao() {
  const state = useControleAceleracaoState();
  const [atendimentoPendente, setAtendimentoPendente] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Buscar sugestões pendentes ao carregar page
  const { data: sugestoesP } = useQuery({
    queryKey: ['sugestoes-pendentes'],
    queryFn: async () => {
      try {
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') return [];
        
        const atendimentos = await base44.entities.ConsultoriaAtendimento.filter({
          data_sugerida_cliente: { $exists: true },
          status: { $in: ['agendado', 'confirmado', 'reagendado'] }
        }, '-created_date', 50);
        
        return atendimentos.filter(a => a.data_sugerida_cliente && a.contagem_lembretes_sugestao < 3);
      } catch (e) {
        console.warn('Erro ao buscar sugestões pendentes:', e.message);
        return [];
      }
    },
    staleTime: 30 * 1000
  });

  useEffect(() => {
    if (sugestoesP && sugestoesP.length > 0) {
      setAtendimentoPendente(sugestoesP[0]);
      setShowModal(true);
    }
  }, [sugestoesP]);

  const handleCloseModal = () => {
    setShowModal(false);
    setAtendimentoPendente(null);
  };

  if (state.loadingUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <WheelLoader size="lg" text="Carregando..." />
      </div>
    );
  }

  return (
    <PageAccessControl
      requiredPermissions={["acceleration.manage"]}
      requiredJobRoles={["acelerador", "consultor", "mentor"]}
    >
      <ControleAceleracaoView state={state} />
      
      {/* Popup para sugestões pendentes */}
      {atendimentoPendente && (
        <SugestaoHorarioPendentePoup
          isOpen={showModal}
          onClose={handleCloseModal}
          atendimento={atendimentoPendente}
        />
      )}
    </PageAccessControl>
  );
}