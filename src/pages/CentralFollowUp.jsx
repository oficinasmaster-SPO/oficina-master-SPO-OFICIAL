import React, { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import FollowUpsTab from '@/components/aceleracao/FollowUpsTab';
import SidePanel from '@/components/aceleracao/followups/SidePanel';
import NewFollowUpFAB from '@/components/aceleracao/NewFollowUpFAB';
import IniciarAtendimentoModal from '@/components/aceleracao/IniciarAtendimentoModal';
import { useAuth } from '@/lib/AuthContext';
import useEmployeeResolver from '@/hooks/useEmployeeResolver';
import { getInitials } from '@/lib/avatarUtils';

export default function CentralFollowUp() {
  useEffect(() => {
    const isCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
    if (!isCollapsed) {
      localStorage.setItem('sidebar-collapsed', 'true');
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('sidebar-toggle'));
      }, 50);
    }
  }, []);

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split("T")[0];

  const [showNovoFollowUp, setShowNovoFollowUp] = useState(false);
  const [consultorSelecionado, setConsultorSelecionado] = useState(null);

  // Cockpit state
  const [cockpit, setCockpit] = useState({ reminder: null, seqNum: null, stats: null });
  const [showAtendimento, setShowAtendimento] = useState(false);
  const [atendimentoReminder, setAtendimentoReminder] = useState(null);
  const [atendimentoFila, setAtendimentoFila] = useState([]);

  // Central Operacional state
  const [prioridadeData, setPrioridadeData] = useState(null);
  const [activePill, setActivePill] = useState("todos");
  const [crmFilterPill, setCrmFilterPill] = useState("todos");

  const PILL_MAP = {
    sp_sem_followup: "por_empresa",
    sp_sem_contato_7d: "atrasados",
    sp_nao_respondeu: "concluidos",
    sp_pedidos_abertos: "concluidos",
    sp_vencidos: "atrasados",
    sp_sem_contato_registrado: "por_empresa",
    concluidos: "concluidos",
    atrasados: "atrasados",
  };

  // Declarado ANTES dos callbacks que o referenciam — evita TDZ (temporal dead zone).
  const consultorEfetivo = consultorSelecionado === 'todos' ? null : consultorSelecionado;

  const handleSelectForCockpit = useCallback((reminder, seqNum, stats) => {
    setCockpit({ reminder, seqNum, stats });
  }, []);

  const handlePrioridadeClick = useCallback((spId) => {
    setActivePill(spId);
    setCrmFilterPill(PILL_MAP[spId] || "todos");
  }, []);

  const handleCrmFilterPillChange = useCallback((pillId) => {
    setCrmFilterPill(pillId);
    setActivePill(pillId);
  }, []);

  const handleSelectReminder = useCallback((r) => {
    handleSelectForCockpit(r, null, null);
  }, [handleSelectForCockpit]);

  const handleIniciarAtendimento = useCallback((reminder) => {
    // Ler a fila atual do cache (mesma query key do FollowUpsTab) — sem disparar nova leitura.
    // Sem a fila, as setas ◀ ▶ do modal ficam desabilitadas e o follow-up atual não é encontrado.
    const fila = queryClient.getQueryData(["follow-up-reminders-tab", consultorEfetivo]) || [];
    setAtendimentoFila(Array.isArray(fila) ? fila : []);
    setAtendimentoReminder(reminder);
    setShowAtendimento(true);
  }, [queryClient, consultorEfetivo]);

  const handleClearCockpit = useCallback(() => {
    setCockpit({ reminder: null, seqNum: null, stats: null });
  }, []);

  useEffect(() => {
    if (!consultorSelecionado) {
      setConsultorSelecionado("todos");
    }
  }, [consultorSelecionado]);

  // Resolve nome real + foto via Employee (User.full_name pode vir como "Aceleradora...")
  const { getName, getPhoto } = useEmployeeResolver();

  const { data: consultores = [] } = useQuery({
    queryKey: ['consultores-internos'],
    queryFn: async () => {
      // Fonte canônica: Employee.user_type === 'internal'.
      const employees = await base44.entities.Employee.filter({
        user_type: 'internal',
        user_status: 'ativo',
      }, 'full_name', 200);
      return employees
        .filter(e => e.user_id && e.user_id !== user?.id)
        .map(e => ({ id: e.user_id, full_name: e.full_name, email: e.email }))
        .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
    },
    staleTime: 10 * 60 * 1000,
  });

  const fullName = getName(user?.id, user?.full_name || user?.email || '');
  const profilePicture = getPhoto(user?.id) || user?.profile_picture_url;
  const firstName = fullName.split(' ')[0];

  return (
    <div className="space-y-3">
      {/* Compact header bar ~60px */}
      <div className="relative rounded-xl overflow-hidden bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 px-5 py-3 flex items-center gap-4 shadow-md">
        {/* Title + pulse */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <h1 className="text-base font-extrabold text-white leading-none tracking-tight">
            Central de Follow-up
          </h1>
        </div>

        {/* Separator */}
        <div className="w-px h-5 bg-gray-700 flex-shrink-0" />

        {/* Spacer */}
        <div className="flex-1" />

        {/* User greeting + avatar */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <span className="text-xs text-gray-400 hidden sm:block">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
          </span>
          {profilePicture ? (
            <img
              src={profilePicture}
              alt={firstName}
              className="w-7 h-7 rounded-full object-cover flex-shrink-0 ring-1 ring-red-500/40"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center font-bold text-white text-[11px] flex-shrink-0 ring-1 ring-red-500/40">
              {getInitials(fullName)}
            </div>
          )}
          <span className="text-xs font-semibold text-white hidden sm:block">{firstName}</span>
        </div>
      </div>

      {/* Grid 2 colunas — Fila (esquerda) + Cockpit (direita) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">
        <div className="min-w-0">
          <FollowUpsTab
            consultorEfetivo={consultorEfetivo}
            userId={user?.id}
            onSelectForCockpit={handleSelectForCockpit}
            selectedReminderId={cockpit.reminder?.id}
            onIniciarAtendimento={handleIniciarAtendimento}
            consultorSelecionado={consultorSelecionado}
            onConsultorChange={setConsultorSelecionado}
            consultores={consultores}
            crmFilterPill={crmFilterPill}
            onCrmFilterPillChange={handleCrmFilterPillChange}
            onPrioridadeData={setPrioridadeData}
          />
        </div>
        <div className="hidden lg:block sticky top-20">
          <SidePanel
            reminder={cockpit.reminder}
            seqNum={cockpit.seqNum}
            stats={cockpit.stats}
            today={today}
            onIniciarAtendimento={handleIniciarAtendimento}
            onClear={handleClearCockpit}
            prioridadeData={prioridadeData}
            activePill={activePill}
            onPrioridadeClick={handlePrioridadeClick}
            onSelectReminder={handleSelectReminder}
          />
        </div>
      </div>

      {/* FAB */}
      <NewFollowUpFAB onClick={() => setShowNovoFollowUp(true)} />

      {showNovoFollowUp && (
        <IniciarAtendimentoModal
          followUp={null}
          cliente={null}
          openClientSelectorOnMount={true}
          onClose={() => setShowNovoFollowUp(false)}
          onSaved={() => setShowNovoFollowUp(false)}
        />
      )}

      {showAtendimento && atendimentoReminder && (
        <IniciarAtendimentoModal
          followUp={atendimentoReminder}
          cliente={null}
          filaReminders={atendimentoFila}
          onClose={() => setShowAtendimento(false)}
          onSaved={() => {
            setShowAtendimento(false);
            queryClient.invalidateQueries({ queryKey: ["follow-up-reminders-tab"] });
            queryClient.invalidateQueries({ queryKey: ["follow-up-reminders-concluidos-tab"] });
          }}
        />
      )}
    </div>
  );
}