// rebuild trigger v2
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import useControleAceleracaoState from "@/components/hooks/useControleAceleracaoState";
import ControleAceleracaoView from "@/components/aceleracao/ControleAceleracaoView";
import WheelLoader from "@/components/ui/WheelLoader";
import SugestaoHorarioPendentePoup from "@/components/aceleracao/SugestaoHorarioPendentePoup";

export default function ControleAceleracao() {
  const state = useControleAceleracaoState();
  const [atendimentoPendente, setAtendimentoPendente] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Buscar sugestões pendentes ao carregar page.
  // RAIZ-429: refetchInterval de 10s removido — causava polling agressivo que
  // estourava o limite agregado de leitura (auth.me() + filter a cada 10s).
  // staleTime de 3min é suficiente para um popup de sugestão pendente.
  const { data: sugestoesP } = useQuery({
    queryKey: ['sugestoes-pendentes', state.user?.id, state.user?.role],
    queryFn: async () => {
      try {
        const u = state.user;
        const isInternal = u?.user_type === 'internal' || u?.data?.user_type === 'internal';
        if (!u || (u.role !== 'admin' && !isInternal)) return [];
        
        const allAtendimentos = await base44.entities.ConsultoriaAtendimento.filter({
          status: { $in: ['agendado', 'confirmado', 'reagendado'] }
        }, '-created_date', 100);
        
        // Filtrar apenas os que têm sugestão de horário do cliente
        return allAtendimentos.filter(a => 
          a.data_sugerida_cliente && 
          a.hora_sugerida_cliente && 
          a.mensagem_cliente
        );
      } catch (e) {
        console.warn('Erro ao buscar sugestões pendentes:', e.message);
        return [];
      }
    },
    enabled: !!state.user?.id,
    staleTime: 3 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: 'stale',
    retry: false, // RAIZ-429: não retentar em rate limit
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
    <>
      <ControleAceleracaoView state={state} />

      {/* Popup para sugestões pendentes */}
      {atendimentoPendente && (
        <SugestaoHorarioPendentePoup
          isOpen={showModal}
          onClose={handleCloseModal}
          atendimento={atendimentoPendente}
        />
      )}
    </>
  );
}