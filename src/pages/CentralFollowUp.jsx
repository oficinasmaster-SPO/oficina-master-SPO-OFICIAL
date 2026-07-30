import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import FollowUpsTab from '@/components/aceleracao/FollowUpsTab';
import OperationSidebar from '@/components/aceleracao/OperationSidebar';
import NewFollowUpFAB from '@/components/aceleracao/NewFollowUpFAB';
import IniciarAtendimentoModal from '@/components/aceleracao/IniciarAtendimentoModal';
import { useAuth } from '@/lib/AuthContext';
import useEmployeeResolver from '@/hooks/useEmployeeResolver';
import { Users, Check, ChevronDown } from 'lucide-react';
import { getInitials } from '@/lib/avatarUtils';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

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
  const [showNovoFollowUp, setShowNovoFollowUp] = useState(false);
  const [consultorSelecionado, setConsultorSelecionado] = useState(null);

  useEffect(() => {
    if (user?.id && !consultorSelecionado) {
      setConsultorSelecionado(user.id);
    }
  }, [user?.id]);

  // Resolve nome real + foto via Employee (User.full_name pode vir como "Aceleradora...")
  const { getName, getPhoto } = useEmployeeResolver();

  const { data: consultores = [] } = useQuery({
    queryKey: ['consultores-internos'],
    queryFn: async () => {
      // Fonte canônica: Employee.user_type === 'internal' (is_internal legado foi corrigido).
      // Lista todos os colaboradores internos da equipe Oficinas Master.
      const employees = await base44.entities.Employee.filter({
        user_type: 'internal',
        user_status: 'ativo',
      }, 'full_name', 200);
      return employees
        .filter(e => e.user_id)
        .map(e => ({ id: e.user_id, full_name: e.full_name, email: e.email }))
        .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
    },
    staleTime: 10 * 60 * 1000,
  });

  const consultorEfetivo = consultorSelecionado === 'todos' ? null : consultorSelecionado;

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

        {/* Consultant selector — DropdownMenu com checkmark no item selecionado */}
        {(() => {
          const selectedConsultor = consultores.find(c => c.id === consultorSelecionado);
          // Default: usuário logado (user.id). O label usa o full_name do Employee (fonte canônica),
          // assim "Rafael Marrafon" aparece mesmo que o User.full_name ainda seja "Aceleradora...".
          const triggerLabel = consultorSelecionado === 'todos'
            ? 'Todos os Consultores'
            : selectedConsultor
              ? (selectedConsultor.full_name || selectedConsultor.email)
              : (fullName || user?.email || 'Consultor');
          const isSelected = (val) => consultorSelecionado === val;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="w-[200px] bg-gray-800/80 border border-gray-700 text-white text-xs h-7 rounded-md flex items-center px-2 flex-shrink-0 hover:bg-gray-700/80 transition-colors"
                >
                  <Users className="w-3 h-3 mr-1.5 text-gray-400 flex-shrink-0" />
                  <span className="truncate flex-1 text-left">{triggerLabel}</span>
                  <ChevronDown className="w-3 h-3 ml-1 text-gray-400 flex-shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[220px] max-h-[340px] overflow-y-auto">
                <DropdownMenuItem
                  onClick={() => setConsultorSelecionado('todos')}
                  className={isSelected('todos') ? 'bg-gray-100' : ''}
                >
                  <span className="flex-1">Todos os Consultores</span>
                  {isSelected('todos') && <Check className="w-3.5 h-3.5 text-gray-700 ml-auto" />}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {consultores.map(c => (
                  <DropdownMenuItem
                    key={c.id}
                    onClick={() => setConsultorSelecionado(c.id)}
                    className={isSelected(c.id) ? 'bg-gray-100' : ''}
                  >
                    <span className="flex-1 truncate">{c.full_name || c.email}</span>
                    {isSelected(c.id) && <Check className="w-3.5 h-3.5 text-gray-700 ml-auto" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        })()}

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

      {/* Grid 2 colunas — Fila (esquerda) + Painel (direita) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4 items-start">
        <div className="min-w-0">
          <FollowUpsTab consultorEfetivo={consultorEfetivo} userId={user?.id} />
        </div>
        <div className="hidden lg:block sticky top-20">
          <OperationSidebar consultorId={consultorEfetivo || user?.id} />
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
    </div>
  );
}