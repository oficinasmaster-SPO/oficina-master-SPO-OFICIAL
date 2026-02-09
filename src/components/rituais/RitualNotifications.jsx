import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, Calendar, AlertTriangle, CheckCircle, X } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays, isPast, isToday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function RitualNotifications({ workshop, onNotificationClick }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (workshop?.id) {
      loadNotifications();
    }
  }, [workshop?.id]);

  const loadNotifications = async () => {
    try {
      const [schedules, rituals] = await Promise.all([
        base44.entities.ScheduledRitual.filter({ workshop_id: workshop.id }),
        base44.entities.Ritual.filter({ workshop_id: workshop.id })
      ]);

      const alerts = [];
      const today = new Date();

      // Rituais agendados para hoje
      const todaySchedules = schedules.filter(s => 
        s.status === "agendado" && isToday(new Date(s.scheduled_date))
      );
      if (todaySchedules.length > 0) {
        alerts.push({
          id: "today-rituals",
          type: "info",
          title: `${todaySchedules.length} Ritual(is) Agendado(s) Hoje`,
          description: todaySchedules.map(s => s.ritual_name).join(", "),
          priority: "high",
          date: today
        });
      }

      // Rituais agendados para amanhã
      const tomorrowSchedules = schedules.filter(s => 
        s.status === "agendado" && isTomorrow(new Date(s.scheduled_date))
      );
      if (tomorrowSchedules.length > 0) {
        alerts.push({
          id: "tomorrow-rituals",
          type: "warning",
          title: `${tomorrowSchedules.length} Ritual(is) Amanhã`,
          description: tomorrowSchedules.map(s => s.ritual_name).join(", "),
          priority: "medium",
          date: today
        });
      }

      // Rituais atrasados
      const overdueSchedules = schedules.filter(s => 
        s.status === "agendado" && isPast(new Date(s.scheduled_date)) && !isToday(new Date(s.scheduled_date))
      );
      if (overdueSchedules.length > 0) {
        alerts.push({
          id: "overdue-rituals",
          type: "danger",
          title: `${overdueSchedules.length} Ritual(is) Atrasado(s)`,
          description: overdueSchedules.map(s => s.ritual_name).join(", "),
          priority: "urgent",
          date: today
        });
      }

      // Rituais sem MAP vinculado
      const ritualsWithoutMAP = rituals.filter(r => !r.process_document_id);
      if (ritualsWithoutMAP.length > 0) {
        alerts.push({
          id: "no-map-rituals",
          type: "warning",
          title: `${ritualsWithoutMAP.length} Ritual(is) Sem MAP`,
          description: "Rituais personalizados precisam de MAP documentado",
          priority: "low",
          date: today
        });
      }

      // Rituais sem responsável
      const ritualsWithoutResponsible = rituals.filter(r => !r.responsible_user_id);
      if (ritualsWithoutResponsible.length > 0) {
        alerts.push({
          id: "no-responsible-rituals",
          type: "info",
          title: `${ritualsWithoutResponsible.length} Ritual(is) Sem Responsável`,
          description: "Defina responsáveis para melhor gestão",
          priority: "low",
          date: today
        });
      }

      setNotifications(alerts.sort((a, b) => {
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }));
    } catch (error) {
      console.error("Erro ao carregar notificações:", error);
    } finally {
      setLoading(false);
    }
  };

  const dismissNotification = (notifId) => {
    setNotifications(prev => prev.filter(n => n.id !== notifId));
    toast.success("Notificação dispensada");
  };

  const typeConfig = {
    danger: { icon: AlertTriangle, bg: "bg-red-50", border: "border-red-200", text: "text-red-800" },
    warning: { icon: AlertTriangle, bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-800" },
    info: { icon: Bell, bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-800" },
    success: { icon: CheckCircle, bg: "bg-green-50", border: "border-green-200", text: "text-green-800" }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">
          Carregando notificações...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notificações e Alertas ({notifications.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {notifications.length > 0 ? (
          <div className="space-y-3">
            {notifications.map((notif) => {
              const config = typeConfig[notif.type];
              const Icon = config.icon;
              return (
                <div
                  key={notif.id}
                  className={`p-3 rounded-lg border ${config.bg} ${config.border} cursor-pointer hover:shadow-md transition-shadow`}
                  onClick={() => onNotificationClick && onNotificationClick(notif)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <Icon className={`w-5 h-5 ${config.text} mt-0.5`} />
                      <div className="flex-1">
                        <h4 className={`font-semibold text-sm ${config.text}`}>
                          {notif.title}
                        </h4>
                        <p className="text-xs text-gray-600 mt-1">
                          {notif.description}
                        </p>
                        <Badge variant="outline" className="mt-2 text-xs">
                          Prioridade: {notif.priority}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        dismissNotification(notif.id);
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Tudo em dia! Nenhuma notificação pendente.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}