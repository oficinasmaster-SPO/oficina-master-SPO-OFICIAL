import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import FollowUpsTab from '@/components/aceleracao/FollowUpsTab';
import OperationSidebar from '@/components/aceleracao/OperationSidebar';
import NewFollowUpFAB from '@/components/aceleracao/NewFollowUpFAB';
import IniciarAtendimentoModal from '@/components/aceleracao/IniciarAtendimentoModal';
import { useAuth } from '@/lib/AuthContext';
import { Users } from 'lucide-react';
import { getInitials } from '@/lib/avatarUtils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

  const { data: userData } = useQuery({
    queryKey: ['user', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      return await base44.entities.User.get(user.id);
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const consultingFirmId = userData?.data?.consulting_firm_id || user?.consulting_firm_id;

  const { data: consultores = [] } = useQuery({
    queryKey: ['consultores-firma', consultingFirmId],
    queryFn: async () => {
      if (!consultingFirmId) return [];
      const users = await base44.entities.User.filter({
        'data.consulting_firm_id': consultingFirmId,
      }, 'full_name', 200);
      return users.filter(u => u.id !== user?.id).sort((a, b) =>
        (a.full_name || '').localeCompare(b.full_name || '')
      );
    },
    enabled: !!consultingFirmId,
    staleTime: 10 * 60 * 1000,
  });

  const consultorEfetivo = consultorSelecionado === 'todos' ? null : consultorSelecionado;

  const fullName = userData?.full_name || user?.full_name || user?.email || '';
  const profilePicture = userData?.profile_picture_url || user?.profile_picture_url;
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

        {/* Consultant selector */}
        <Select value={consultorSelecionado || ''} onValueChange={setConsultorSelecionado}>
          <SelectTrigger className="w-[200px] bg-gray-800/80 border-gray-700 text-white text-xs h-7 flex-shrink-0">
            <Users className="w-3 h-3 mr-1.5 text-gray-400 flex-shrink-0" />
            <SelectValue placeholder="Selecionar consultor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={user?.id || 'me'}>Meus Follow-ups</SelectItem>
            <SelectItem value="todos">Todos os Consultores</SelectItem>
            {consultores.map(c => (
              <SelectItem key={c.id} value={c.id}>
                {c.full_name || c.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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