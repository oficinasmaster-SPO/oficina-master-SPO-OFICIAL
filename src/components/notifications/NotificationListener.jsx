import React, { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNotificationPush } from './useNotificationPush';
import { toast } from 'sonner';

export default function NotificationListener({ user }) {
  const queryClient = useQueryClient();
  const { permission, sendNotification } = useNotificationPush();

  // Áudio instanciado uma única vez (fora do fluxo de renderização)
  const somAlerta = useRef(typeof Audio !== "undefined"
    ? new Audio('https://media.base44.com/files/public/69540822472c4a70b54d47aa/2826bc406_universfield-simple-notification-152054.mp3')
    : null);

  // BOOT-FIX-01: trocado Notification.list(50) + filtro client-side por
  // Notification.filter({ user_id, is_read:false }, limit:20) server-side.
  // A versão anterior lia 50 notificações de todos os usuários e descartava
  // as que não eram deste user — uma leitura inteira desperdiçada no boot.
  // Agora a query key é ['notifications-unread', id] para não colidir com
  // a query do Layout (['notifications', id]) que também filtra não-lidas.
  useQuery({
    queryKey: ['notifications-unread', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const notifications = await base44.entities.Notification.filter(
        { user_id: user.id, is_read: false },
        '-created_date',
        20
      );
      return Array.isArray(notifications) ? notifications : [];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    retry: false,
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
        // Atualiza a key canônica do Listener (notifications-unread)
      queryClient.setQueryData(['notifications-unread', user.id], (oldData = []) => {
          return [event.data, ...oldData];
        });
        showNotification(event.data);
      }

      // Notificação marcada como lida (outra aba/dropdown) — remove do sino
      if (event.type === 'update' && event.data.user_id === user.id && event.data.is_read) {
        queryClient.setQueryData(['notifications-unread', user.id], (oldData = []) => {
          return oldData.filter(n => n.id !== event.data.id);
        });
      }
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, permission]);

  return null;
}