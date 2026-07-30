import React, { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNotificationPush } from './useNotificationPush';
import { toast } from 'sonner';

export default function NotificationListener({ user }) {
  const queryClient = useQueryClient();
  const { permission, sendNotification } = useNotificationPush();

  // Áudio instanciado uma única vez (fora do fluxo de renderização)
  const somAlerta = useRef(typeof Audio !== "undefined" ? new Audio('/alerta.mp3') : null);

  // Busca inicial para popular o sino/dropdown. staleTime maior pois as
  // novidades virão pelo subscribe (tempo real), não por refetch.
  useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const allNotifications = await base44.entities.Notification.list('-created_date', 50);
      return Array.isArray(allNotifications)
        ? allNotifications.filter(n => n.user_id === user.id && !n.is_read)
        : [];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const showNotification = (notification) => {
    const icons = {
      'prazo_proximo': '⏰',
      'prazo_hoje': '⚠️',
      'prazo_semana': '📅',
      'processo_atrasado': '🔴',
      'processo_concluido': '✅',
      'nova_ata': '📋',
      'meta_batida': '🎯',
      'meta_nacional_empresa': '🏆',
      'meta_nacional_colaborador': '⭐',
      'atrasada': '🔴',
      'status_alterado': '✅',
      'nova_subtarefa': '🔔'
    };

    const icon = icons[notification.type] || '🔔';

    // Toca o som (catch captura bloqueio de autoplay do navegador)
    if (somAlerta.current) {
      somAlerta.current.play().catch(() => {/* Áudio bloqueado até interação */});
    }

    // Toast in-app
    toast(notification.title, {
      description: notification.message,
      icon: icon,
      duration: 8000,
      action: {
        label: 'Ver',
        onClick: () => window.location.href = notification.link_acao || '/Notificacoes'
      }
    });

    // Push nativo do sistema (se permitido)
    if (permission === 'granted') {
      sendNotification(`${icon} ${notification.title}`, {
        body: notification.message,
        tag: notification.id,
        onClick: () => {
          window.location.href = notification.link_acao || '/Notificacoes';
        }
      });
    }
  };

  // Coração do tempo real: escuta eventos da entidade Notification
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = base44.entities.Notification.subscribe((event) => {
      // Nova notificação para este usuário
      if (event.type === 'create' && event.data.user_id === user.id) {
        // Atualização otimista do cache React Query — sincroniza o sino
        queryClient.setQueryData(['notifications', user.id], (oldData = []) => {
          return [event.data, ...oldData];
        });
        showNotification(event.data);
      }

      // Notificação marcada como lida (outra aba/dropdown) — remove do sino
      if (event.type === 'update' && event.data.user_id === user.id && event.data.is_read) {
        queryClient.setQueryData(['notifications', user.id], (oldData = []) => {
          return oldData.filter(n => n.id !== event.data.id);
        });
      }
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, permission]);

  return null;
}