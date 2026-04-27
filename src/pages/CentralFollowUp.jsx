import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import FollowUpsTab from '@/components/aceleracao/FollowUpsTab';
import { useAuth } from '@/lib/AuthContext';
import { Clock } from 'lucide-react';

export default function CentralFollowUp() {
  const { user } = useAuth();

  const { data: userData } = useQuery({
    queryKey: ['user', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      return await base44.entities.User.get(user.id);
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const getInitials = (name = '') =>
    name.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase() || '?';

  const fullName = userData?.full_name || user?.full_name || user?.email || '';
  const profilePicture = userData?.profile_picture_url || user?.profile_picture_url;
  const firstName = fullName.split(' ')[0];

  return (
    <div className="space-y-6">
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 px-8 py-7 flex items-center justify-between shadow-lg">

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
          <h1 className="text-3xl font-bold text-white leading-tight">Central de Follow-up</h1>
          <p className="text-gray-400 mt-1 text-sm">
            Gerencie e acompanhe todos os follow-ups dos clientes em aceleração
          </p>
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
            <p className="text-lg font-semibold text-white leading-tight">{firstName}</p>
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

      <FollowUpsTab />
    </div>
  );
}