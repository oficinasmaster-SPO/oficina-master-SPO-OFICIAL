import React, { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNotificationPush } from './useNotificationPush';
import { toast } from 'sonner';
import { Bell, Clock, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';

export default function NotificationListener({ user }) {
  const queryClient = useQueryClient();
  const { permission, sendNotification } = useNotificationPush();
  const [lastNotificationId, setLastNotificationId] = React.useState(null);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const allNotifications = await base44.entities.Notification.list('-created_date', 50);
      return Array.isArray(allNotifications) 
        ? allNotifications.filter(n => n.user_id === user.id && !n.is_read)
        : [];
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });

  useEffect(() => {
    if (notifications.length === 0) return;

    const latestNotification = notifications[0];
    
    if (lastNotificationId && latestNotification.id !== lastNotificationId) {
      showNotification(latestNotification);
    }
    
    setLastNotificationId(latestNotification.id);
  }, [notifications]);

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
    
    // Toast na aplicação
    toast(notification.title, {
      description: notification.message,
      icon: icon,
      duration: 8000,
      action: {
        label: 'Ver',
        onClick: () => window.location.href = '/Notificacoes'
      }
    });

    // Notificação push nativa do sistema (sempre dispara se tiver permissão)
    if (permission === 'granted') {
      sendNotification(`${icon} ${notification.title}`, {
        body: notification.message,
        tag: notification.id,
        onClick: () => {
          window.location.href = '/Notificacoes';
        }
      });
    }
  };

  return null;
}