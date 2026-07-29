import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import FollowUpsTab from '@/components/aceleracao/FollowUpsTab';
import OperationSidebar from '@/components/aceleracao/OperationSidebar';
import NewFollowUpFAB from '@/components/aceleracao/NewFollowUpFAB';
import IniciarAtendimentoModal from '@/components/aceleracao/IniciarAtendimentoModal';
import { useAuth } from '@/lib/AuthContext';
import { Clock, Users } from 'lucide-react';
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
  const today = new Date().toISOString().split('T')[0];

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
      });
      return users.filter(u => u.id !== user?.id).sort((a, b) =>
        (a.full_name || '').localeCompare(b.full_name || '')
      );
    },
    enabled: !!consultingFirmId,
    staleTime: 10 * 60 * 1000,
  });

  const consultorEfetivo = consultorSelecionado === 'todos' ? null : consultorSelecionado;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const fullName = userData?.full_name || user?.full_name || user?.email || '';
  const profilePicture = userData?.profile_picture_url || user?.profile_picture_url;
  const firstName = fullName.split(' ')[0];

  return (
    <div className="space-y-4">
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 px-8 py-7 flex items-center justify-between shadow-[0_20px_60px_-10px_rgba(0,0,0,0.6),0_8px_24px_-4px_rgba(0,0,0,0.4)]" style={{transform: 'translateZ(0)'}}>

        {/* Detalhes decorativos de fundo */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-8 -left-8 w-48 h-48 rounded-full bg-red-600 opacity-10 blur-2xl" />
          <div className="absolute -bottom-10 right-40 w-56 h-56 rounded-full bg-red-500 opacity-5 blur-3xl" />
        </div>

        {/* LADO ESQUERDO — título e descrição */}
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-semibold text-red-400 uppercase tracking-widest">Área de execução</span>
          </div>
          <h1 className="font-extrabold text-white leading-tight" style={{fontSize: '2.0rem'}}>Central de Follow-up</h1>
          <div className="flex items-center gap-3 mt-2">
            <p className="text-gray-400 text-sm">
              Gerencie e acompanhe todos os follow-ups dos clientes em aceleração
            </p>
            <Select value={consultorSelecionado || ''} onValueChange={setConsultorSelecionado}>
              <SelectTrigger className="w-[220px] bg-gray-800/80 border-gray-700 text-white text-xs h-8">
                <Users className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
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
          </div>
        </div>

        {/* LADO DIREITO — boas-vindas consultor */}
        <div className="relative z-10 flex items-center gap-4">
          <div className="text-right">
            <div className="flex items-center justify-end gap-1.5 mb-0.5">
              <Clock className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-xs text-gray-500">
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
              </span>
            </div>
            <p className="text-sm text-gray-400">{getGreeting()},</p>
            <p className="font-extrabold text-white leading-tight" style={{fontSize: '1.26rem'}}>{firstName}</p>
          </div>
          {profilePicture ? (
            <img
              src={profilePicture}
              alt={firstName}
              className="w-11 h-11 rounded-full object-cover flex-shrink-0 ring-2 ring-red-500/30"
            />
          ) : (
            <div className="w-11 h-11 rounded-full bg-red-600 flex items-center justify-center font-bold text-white text-sm flex-shrink-0 ring-2 ring-red-500/30">
              {getInitials(fullName)}
            </div>
          )}
        </div>
      </div>

      {/* Grid 2 colunas — Fila (esquerda) + Inteligência (direita) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">
        <div className="min-w-0">
          <FollowUpsTab consultorEfetivo={consultorEfetivo} userId={user?.id} />
        </div>
        <div className="hidden lg:block sticky top-20">
          <OperationSidebar />
        </div>
      </div>

      {/* FAB — fixo na tela */}
      <NewFollowUpFAB onClick={() => setShowNovoFollowUp(true)} />

      {/* Modal Novo Follow-up */}
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