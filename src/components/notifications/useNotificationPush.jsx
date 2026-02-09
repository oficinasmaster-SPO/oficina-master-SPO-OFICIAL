import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export function useNotificationPush() {
  const [permission, setPermission] = useState(() => 
    'Notification' in window ? Notification.permission : 'default'
  );
  const [isSupported, setIsSupported] = useState(false);

  const checkPermission = useCallback(() => {
    if ('Notification' in window) {
      const currentPermission = Notification.permission;
      setPermission(prev => {
        if (prev !== currentPermission) {
          console.log('🔔 Permission changed:', prev, '→', currentPermission);
        }
        return currentPermission;
      });
      return currentPermission;
    }
    return 'default';
  }, []);

  useEffect(() => {
    if ('Notification' in window) {
      setIsSupported(true);
      checkPermission();
      
      // Evento customizado para forçar atualização
      const handleRefresh = () => checkPermission();
      window.addEventListener('focus', checkPermission);
      window.addEventListener('notification-permission-refresh', handleRefresh);
      
      // Verifica a cada 1 segundo para detectar mudanças
      const interval = setInterval(checkPermission, 1000);
      
      return () => {
        window.removeEventListener('focus', checkPermission);
        window.removeEventListener('notification-permission-refresh', handleRefresh);
        clearInterval(interval);
      };
    }
  }, [checkPermission]);

  const requestPermission = async () => {
    if (!isSupported) {
      toast.error('Notificações não suportadas neste navegador');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        toast.success('Notificações ativadas!');
        return true;
      } else {
        toast.error('Permissão de notificações negada');
        return false;
      }
    } catch (error) {
      console.error('Erro ao solicitar permissão:', error);
      return false;
    }
  };

  const sendNotification = (title, options = {}) => {
    if (!isSupported) return;
    
    if (permission !== 'granted') {
      console.warn('Permissão de notificação não concedida');
      return;
    }

    try {
      const notification = new Notification(title, {
        icon: '/logo192.png',
        badge: '/logo192.png',
        vibrate: [200, 100, 200],
        requireInteraction: false,
        ...options
      });

      notification.onclick = () => {
        window.focus();
        if (options.onClick) {
          options.onClick();
        }
        notification.close();
      };

      setTimeout(() => notification.close(), 10000);
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
    }
  };

  return {
    permission,
    isSupported,
    requestPermission,
    sendNotification,
    refreshPermission: checkPermission
  };
}