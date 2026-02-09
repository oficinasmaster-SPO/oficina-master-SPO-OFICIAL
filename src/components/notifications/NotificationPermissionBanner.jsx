import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, X } from 'lucide-react';
import { useNotificationPush } from './useNotificationPush';

export default function NotificationPermissionBanner() {
  const [show, setShow] = useState(false);
  const { permission, isSupported, requestPermission } = useNotificationPush();

  useEffect(() => {
    const dismissed = localStorage.getItem('notification-banner-dismissed');
    if (isSupported && permission === 'default' && !dismissed) {
      setTimeout(() => setShow(true), 3000);
    }
  }, [isSupported, permission]);

  const handleRequest = async () => {
    const granted = await requestPermission();
    if (granted) {
      setShow(false);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('notification-banner-dismissed', 'true');
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md animate-slide-up">
      <Card className="shadow-2xl border-2 border-blue-500">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Bell className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">
                Ativar Notificações
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Receba alertas importantes sobre prazos, processos e atualizações mesmo quando não estiver usando a plataforma.
              </p>
              <div className="flex gap-2">
                <Button 
                  onClick={handleRequest}
                  className="bg-blue-600 hover:bg-blue-700"
                  size="sm"
                >
                  Ativar Agora
                </Button>
                <Button 
                  onClick={handleDismiss}
                  variant="ghost"
                  size="sm"
                >
                  Agora Não
                </Button>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              className="h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}