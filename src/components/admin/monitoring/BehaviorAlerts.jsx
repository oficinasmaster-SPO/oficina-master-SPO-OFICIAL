import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Coffee, Clock, TrendingDown, Eye } from "lucide-react";

export default function BehaviorAlerts({ sessions, onViewDetails }) {
  const detectAlerts = () => {
    const alerts = [];
    const now = new Date();

    sessions.forEach(session => {
      // Alerta: Idle excessivo
      const idlePercentage = session.total_time_seconds > 0
        ? (session.idle_time_seconds / session.total_time_seconds) * 100
        : 0;
      
      if (idlePercentage > 60 && session.total_time_seconds > 300) {
        alerts.push({
          id: `idle-${session.id}`,
          type: 'idle_excessive',
          severity: 'warning',
          user: session.user_name,
          userId: session.user_id,
          message: `${idlePercentage.toFixed(0)}% do tempo em idle`,
          details: `${Math.floor(session.idle_time_seconds / 60)}min de inatividade`,
          icon: Coffee,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          timestamp: session.last_activity_time
        });
      }

      // Alerta: Sessão muito curta (< 2 min)
      if (!session.is_active && session.total_time_seconds < 120) {
        alerts.push({
          id: `short-${session.id}`,
          type: 'short_session',
          severity: 'info',
          user: session.user_name,
          userId: session.user_id,
          message: 'Sessão muito curta',
          details: `Apenas ${Math.floor(session.total_time_seconds / 60)}min`,
          icon: Clock,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          timestamp: session.login_time
        });
      }

      // Alerta: Baixa interação (poucas páginas)
      if (session.is_active && session.pages_visited < 2 && session.total_time_seconds > 600) {
        alerts.push({
          id: `low-${session.id}`,
          type: 'low_interaction',
          severity: 'warning',
          user: session.user_name,
          userId: session.user_id,
          message: 'Baixa interação',
          details: `Apenas ${session.pages_visited} página(s) em ${Math.floor(session.total_time_seconds / 60)}min`,
          icon: TrendingDown,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          timestamp: session.last_activity_time
        });
      }

      // Alerta: Sem atividade há muito tempo (> 10 min)
      if (session.is_active && session.last_activity_time) {
        const lastActivity = new Date(session.last_activity_time);
        const minutesSinceActivity = Math.floor((now - lastActivity) / (1000 * 60));
        
        if (minutesSinceActivity > 10) {
          alerts.push({
            id: `inactive-${session.id}`,
            type: 'inactive_long',
            severity: 'critical',
            user: session.user_name,
            userId: session.user_id,
            message: 'Inativo há muito tempo',
            details: `${minutesSinceActivity}min sem atividade`,
            icon: AlertTriangle,
            color: 'text-red-600',
            bgColor: 'bg-red-50',
            timestamp: session.last_activity_time
          });
        }
      }
    });

    // Ordena por severidade
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  };

  const alerts = detectAlerts();

  if (alerts.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-green-600">
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              ✓
            </div>
            <p className="font-medium">Tudo normal!</p>
            <p className="text-sm text-gray-600">Nenhum comportamento atípico detectado</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Alertas Comportamentais
          </CardTitle>
          <div className="flex gap-2">
            {criticalCount > 0 && (
              <Badge className="bg-red-100 text-red-700">
                {criticalCount} crítico(s)
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge className="bg-yellow-100 text-yellow-700">
                {warningCount} aviso(s)
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.map(alert => {
            const Icon = alert.icon;
            
            return (
              <div
                key={alert.id}
                className={`flex items-start gap-3 p-4 rounded-lg border ${alert.bgColor} border-current/20`}
              >
                <div className={`${alert.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-gray-900">{alert.user}</p>
                    <Badge variant="outline" className="text-xs">
                      {alert.type.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-700">{alert.message}</p>
                  <p className="text-xs text-gray-600 mt-1">{alert.details}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onViewDetails?.({ id: alert.userId, name: alert.user })}
                >
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}