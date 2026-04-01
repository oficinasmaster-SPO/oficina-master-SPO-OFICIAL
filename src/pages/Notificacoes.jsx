import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bell, AlertTriangle, Clock, CheckCircle2, Trash2, Loader2, FileText, Users, Zap } from "lucide-react";
import { format, isPast, isToday, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import NotificationPreferences from "@/components/notifications/NotificationPreferences";
import { useNotificationPush } from "@/components/notifications/useNotificationPush";

export default function Notificacoes() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const { sendNotification, permission } = useNotificationPush();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      // checkOverdueTasks removido - gerava notificações em loop
      // Use automações de backend para checar prazos
    } catch (error) {
      console.error(error);
    }
  };

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const adminWorkshopId = urlParams.get('workshop_id');
        let result;
        try {
          if (adminWorkshopId && user.role === 'admin') {
            result = await base44.entities.Notification.filter({ workshop_id: adminWorkshopId }, '-created_date', 100);
          } else {
            result = await base44.entities.Notification.filter({ user_id: user.id }, '-created_date', 100);
          }
        } catch (filterError) {
          // Se falhar filter, tenta list como fallback
          console.log('Filter failed, trying list:', filterError);
          result = await base44.entities.Notification.list('-created_date', 100);
        }
        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.log("Error fetching notifications:", error);
        return [];
      }
    },
    enabled: !!user?.id,
    retry: 2
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['my-tasks', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const adminWorkshopId = urlParams.get('workshop_id');
        
        if (adminWorkshopId && user.role === 'admin') {
          const allTasks = await base44.entities.Task.filter({ workshop_id: adminWorkshopId }, '-created_date', 500);
          return Array.isArray(allTasks) ? allTasks : [];
        } else {
          const allTasks = await base44.entities.Task.list('-created_date', 500);
          const tasksArray = Array.isArray(allTasks) ? allTasks : [];
          return tasksArray.filter(t => 
            t.assigned_to && 
            Array.isArray(t.assigned_to) && 
            t.assigned_to.includes(user.id)
          );
        }
      } catch (error) {
        console.log("Error fetching tasks:", error);
        return [];
      }
    },
    enabled: !!user?.id,
    retry: 1
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId) => {
      return await base44.entities.Notification.update(notificationId, { is_read: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
    }
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId) => {
      try {
        await base44.entities.Notification.delete(notificationId);
        return { success: true, id: notificationId };
      } catch (error) {
        console.error('Delete error:', error);
        if (error?.response?.status === 404 || error?.message?.includes('404')) {
          // Notificação já foi deletada
          return { success: true, id: notificationId, alreadyDeleted: true };
        }
        throw error;
      }
    },
    onSuccess: (data) => {
      // Invalida a query de notificações
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      if (!data?.alreadyDeleted) {
        toast.success('Notificação removida');
      }
    },
    onError: (error) => {
      console.error('Mutation error:', error);
      toast.error('Erro ao remover notificação: ' + (error?.message || 'Desconhecido'));
    }
  });

  const [isClearingInBackground, setIsClearingInBackground] = useState(false);

  const clearAllInBackground = async () => {
    const total = notifications.length;
    setShowClearDialog(false);
    setIsClearingInBackground(true);
    
    const toastId = toast.loading(`Limpando ${total} notificações em segundo plano...`, {
      duration: Infinity
    });

    try {
      let totalDeleted = 0;
      let remaining = 1;

      while (remaining > 0) {
        const response = await base44.functions.invoke('clearNotifications', { mode: 'all' });
        const data = response.data;
        totalDeleted += data.deleted || 0;
        remaining = data.remaining || 0;
        toast.loading(`Limpando notificações... ${totalDeleted} removidas`, { id: toastId });

        if (remaining > 0) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }

      toast.success(`${totalDeleted} notificações removidas com sucesso!`, { id: toastId });
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch (error) {
      console.error('Clear all error:', error);
      toast.error('Erro ao limpar notificações: ' + (error?.message || 'Desconhecido'), { id: toastId });
    } finally {
      setIsClearingInBackground(false);
    }
  };

  const checkOverdueTasks = async (currentUser) => {
    if (!currentUser?.id) return;

    try {
      const allTasks = await base44.entities.Task.list('-created_date', 500);
      const tasksArray = Array.isArray(allTasks) ? allTasks : [];
      
      const myTasks = tasksArray.filter(t => 
        t.assigned_to && 
        Array.isArray(t.assigned_to) && 
        t.assigned_to.includes(currentUser.id) && 
        t.status !== "concluida"
      );

      for (const task of myTasks) {
        if (!task.due_date) continue;

        const dueDate = new Date(task.due_date);
        const today = new Date();
        const daysUntilDue = differenceInDays(dueDate, today);

        // Notificação de prazo próximo (0 a 3 dias)
        if (daysUntilDue <= 3 && daysUntilDue >= 0) {
          const existingNotifications = await base44.entities.Notification.list();
          // Verifica se já existe notificação para esta tarefa (usando metadata ou título similar como fallback)
          const alreadyNotified = existingNotifications.some(
            n => (n.metadata?.task_id === task.id || n.message.includes(task.title)) && n.type === "prazo_proximo" && !n.is_read
          );

          if (!alreadyNotified) {
            await base44.entities.Notification.create({
              user_id: currentUser.id,
              type: "prazo_proximo",
              title: "Prazo se aproximando",
              message: `A tarefa "${task.title}" vence em ${daysUntilDue} dia${daysUntilDue !== 1 ? 's' : ''}`,
              is_read: false,
              metadata: { task_id: task.id }
            });
          }
        }

        // Notificação de atraso
        if (isPast(dueDate) && !isToday(dueDate)) {
          const existingNotifications = await base44.entities.Notification.list();
          const existingArray = Array.isArray(existingNotifications) ? existingNotifications : [];
          const alreadyNotified = existingArray.some(
            n => (n.metadata?.task_id === task.id || n.message.includes(task.title)) && n.type === "atrasada" && !n.is_read
          );

          if (!alreadyNotified) {
            await base44.entities.Notification.create({
              user_id: currentUser.id,
              type: "atrasada",
              title: "Tarefa atrasada",
              message: `A tarefa "${task.title}" está atrasada há ${Math.abs(daysUntilDue)} dia${Math.abs(daysUntilDue) !== 1 ? 's' : ''}`,
              is_read: false,
              metadata: { task_id: task.id }
            });
            
            // Opcional: Atualizar flag na tarefa se existir campo correspondente, mas Task geralmente não tem is_overdue por padrão
            // await base44.entities.Task.update(task.id, { is_overdue: true });
          }
        }
      }

      queryClient.invalidateQueries(['notifications']);
    } catch (error) {
      console.log("Error checking overdue tasks:", error);
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      'a_fazer': 'A Fazer',
      'em_andamento': 'Em Andamento',
      'concluido': 'Concluído'
    };
    return labels[status];
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  // Usando tasks (Entidade Task) com status 'concluida'
  const todayTasks = tasks.filter(t => 
    t.due_date && isToday(new Date(t.due_date)) && t.status !== "concluida"
  );
  const overdueTasks = tasks.filter(t => 
    t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)) && t.status !== "concluida"
  );

  const testarNotificacoes = async () => {
    try {
      const loadingToast = toast.loading('Enviando notificações de teste...');
      
      await base44.functions.invoke('testarNotificacoes');
      
      toast.dismiss(loadingToast);
      toast.success('✅ 3 notificações criadas no banco!');
      
      // Aguarda um pouco e depois invalida queries para mostrar as notificações
      setTimeout(async () => {
        queryClient.invalidateQueries(['notifications']);
        queryClient.invalidateQueries(['notifications-listener']);
        
        // Envia notificações push se tiver permissão
        if (permission === 'granted') {
          try {
            console.log('🔔 Enviando notificações push...');
            
            const result1 = sendNotification('🧪 Teste de Notificação 1', {
              body: 'Esta é uma notificação push de teste do sistema',
              icon: '/logo192.png',
              tag: 'test-1',
              requireInteraction: false
            });
            console.log('Notificação 1:', result1);
            
            setTimeout(() => {
              const result2 = sendNotification('⚠️ Teste de Notificação 2', {
                body: 'Segunda notificação push - funcionando perfeitamente!',
                icon: '/logo192.png',
                tag: 'test-2',
                requireInteraction: false
              });
              console.log('Notificação 2:', result2);
            }, 1500);
            
            setTimeout(() => {
              const result3 = sendNotification('✅ Teste de Notificação 3', {
                body: 'Terceira notificação push - sistema completo!',
                icon: '/logo192.png',
                tag: 'test-3',
                requireInteraction: false
              });
              console.log('Notificação 3:', result3);
            }, 3000);
            
            toast.success('🔔 3 notificações push enviadas! Verifique a área de notificações do sistema.');
          } catch (error) {
            console.error('❌ Erro ao enviar push:', error);
            toast.error('❌ Erro ao enviar notificações push: ' + error.message);
          }
        } else if (permission === 'denied') {
          toast.warning('⚠️ Notificações push bloqueadas. Ative nas configurações do navegador.');
        } else {
          toast.info('ℹ️ Permissão: ' + permission + '. Clique em "Ativar Notificações Push" primeiro.');
        }
      }, 2000);
    } catch (error) {
      toast.error('❌ Erro ao criar notificações de teste');
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      'prazo_proximo': <Clock className="w-5 h-5 text-yellow-600" />,
      'prazo_hoje': <Clock className="w-5 h-5 text-orange-600" />,
      'prazo_semana': <Clock className="w-5 h-5 text-blue-600" />,
      'processo_atrasado': <AlertTriangle className="w-5 h-5 text-red-600" />,
      'processo_concluido': <CheckCircle2 className="w-5 h-5 text-green-600" />,
      'nova_ata': <FileText className="w-5 h-5 text-purple-600" />,
      'meta_batida': <CheckCircle2 className="w-5 h-5 text-green-600" />,
      'meta_nacional_empresa': <Users className="w-5 h-5 text-blue-600" />,
      'meta_nacional_colaborador': <Users className="w-5 h-5 text-purple-600" />,
      'atrasada': <AlertTriangle className="w-5 h-5 text-red-600" />,
      'status_alterado': <CheckCircle2 className="w-5 h-5 text-green-600" />,
      'nova_subtarefa': <Bell className="w-5 h-5 text-blue-600" />,
      'document_expiring': <Clock className="w-5 h-5 text-orange-600" />,
      'document_expired': <AlertTriangle className="w-5 h-5 text-red-600" />,
      'document_uploaded': <CheckCircle2 className="w-5 h-5 text-blue-600" />,
      'medical_certificate': <AlertTriangle className="w-5 h-5 text-red-600" />,
      'course_deadline': <Clock className="w-5 h-5 text-purple-600" />,
      'new_document': <CheckCircle2 className="w-5 h-5 text-green-600" />,
      'high_legal_impact': <AlertTriangle className="w-5 h-5 text-red-600" />
    };
    return icons[type] || <Bell className="w-5 h-5 text-gray-600" />;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Bell className="w-8 h-8 text-blue-600" />
                <h1 className="text-4xl font-bold text-gray-900">
                  Notificações e Alertas
                </h1>
                {unreadCount > 0 && (
                  <Badge className="bg-red-500 text-white">
                    {unreadCount} nova{unreadCount !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              <p className="text-gray-600">
                Acompanhe prazos, atualizações e tarefas pendentes
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowClearDialog(true)}
                variant="outline"
                className="gap-2"
                disabled={notifications.length === 0 || isClearingInBackground}
              >
                {isClearingInBackground ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                {isClearingInBackground ? 'Limpando...' : 'Limpar Tudo'}
              </Button>
              <Button
                onClick={testarNotificacoes}
                variant="outline"
                className="gap-2"
              >
                🧪 Testar Notificações
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-lg border-l-4 border-yellow-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Vencem Hoje</p>
                  <p className="text-3xl font-bold text-gray-900">{todayTasks.length}</p>
                </div>
                <Clock className="w-10 h-10 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-l-4 border-red-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Atrasadas</p>
                  <p className="text-3xl font-bold text-gray-900">{overdueTasks.length}</p>
                </div>
                <AlertTriangle className="w-10 h-10 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-l-4 border-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Não Lidas</p>
                  <p className="text-3xl font-bold text-gray-900">{unreadCount}</p>
                </div>
                <Bell className="w-10 h-10 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="bg-white shadow-md">
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="unread">Não Lidas</TabsTrigger>
            <TabsTrigger value="tasks">Minhas Tarefas</TabsTrigger>
            <TabsTrigger value="preferences">Preferências</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {notifications.length === 0 ? (
              <Card className="shadow-lg">
                <CardContent className="p-12 text-center text-gray-500">
                  Nenhuma notificação ainda
                </CardContent>
              </Card>
            ) : (
              notifications.map((notification) => (
                <Card key={notification.id} className={`shadow-md ${notification.is_read ? 'opacity-60' : 'border-l-4 border-blue-500'}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {notification.title}
                        </h3>
                        <p className="text-gray-700 mb-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(notification.created_date), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {!notification.is_read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsReadMutation.mutate(notification.id)}
                          >
                            Marcar como lida
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteNotificationMutation.mutate(notification.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="unread" className="space-y-4">
            {notifications.filter(n => !n.is_read).length === 0 ? (
              <Card className="shadow-lg">
                <CardContent className="p-12 text-center text-gray-500">
                  Nenhuma notificação não lida
                </CardContent>
              </Card>
            ) : (
              notifications.filter(n => !n.is_read).map((notification) => (
                <Card key={notification.id} className="shadow-md border-l-4 border-blue-500">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {notification.title}
                        </h3>
                        <p className="text-gray-700 mb-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(notification.created_date), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsReadMutation.mutate(notification.id)}
                        >
                          Marcar como lida
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteNotificationMutation.mutate(notification.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="tasks" className="space-y-6">
            {todayTasks.length > 0 && (
              <Card className="shadow-lg border-l-4 border-yellow-500">
                <CardHeader className="bg-yellow-50">
                  <CardTitle className="flex items-center gap-2 text-yellow-900">
                    <Clock className="w-5 h-5" />
                    Tarefas que Vencem Hoje ({todayTasks.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    {todayTasks.map((task) => (
                      <div key={task.id} className="bg-white p-4 rounded-lg border border-yellow-200">
                        <h4 className="font-semibold text-gray-900 mb-1">{task.title}</h4>
                        {task.description && (
                          <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                        )}
                        <div className="flex items-center gap-2">
                          <Badge className="bg-yellow-100 text-yellow-700">
                            Vence hoje
                          </Badge>
                          <Badge variant="outline">
                            {getStatusLabel(task.status)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {overdueTasks.length > 0 && (
              <Card className="shadow-lg border-l-4 border-red-500">
                <CardHeader className="bg-red-50">
                  <CardTitle className="flex items-center gap-2 text-red-900">
                    <AlertTriangle className="w-5 h-5" />
                    Tarefas Atrasadas ({overdueTasks.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    {overdueTasks.map((task) => {
                      const daysOverdue = Math.abs(differenceInDays(new Date(task.due_date), new Date()));
                      
                      return (
                        <div key={task.id} className="bg-white p-4 rounded-lg border border-red-200">
                          <h4 className="font-semibold text-gray-900 mb-1">{task.title}</h4>
                          {task.description && (
                            <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                          )}
                          <div className="flex items-center gap-2">
                            <Badge className="bg-red-100 text-red-700">
                              Atrasada há {daysOverdue} dia{daysOverdue !== 1 ? 's' : ''}
                            </Badge>
                            <Badge variant="outline">
                              Venceu em {format(new Date(task.due_date), "dd/MM/yyyy")}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {todayTasks.length === 0 && overdueTasks.length === 0 && (
              <Card className="shadow-lg">
                <CardContent className="p-12 text-center">
                  <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <p className="text-xl font-semibold text-gray-900 mb-2">
                    Tudo em dia! 🎉
                  </p>
                  <p className="text-gray-600">
                    Você não tem tarefas vencendo hoje ou atrasadas.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="preferences">
            <NotificationPreferences user={user} />
          </TabsContent>
        </Tabs>

        <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Limpar Todas as Notificações</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja remover todas as {notifications.length} notificações? Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowClearDialog(false)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={clearAllInBackground}
              >
                Remover Todas
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}