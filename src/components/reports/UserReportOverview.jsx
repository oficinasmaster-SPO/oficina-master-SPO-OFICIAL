import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Activity, Monitor, Calendar } from "lucide-react";
import { format, differenceInMinutes, differenceInHours } from "date-fns";

export default function UserReportOverview({ userData, filters }) {
  const { sessions, activityLogs, user } = userData;

  // Calcular métricas
  const totalSessions = sessions.length;
  const totalActiveTime = sessions.reduce((acc, session) => {
    if (session.end_time) {
      return acc + differenceInMinutes(new Date(session.end_time), new Date(session.start_time));
    }
    return acc;
  }, 0);

  const lastAccess = sessions.length > 0 
    ? sessions.sort((a, b) => new Date(b.start_time) - new Date(a.start_time))[0].start_time
    : null;

  const totalActions = activityLogs.length;

  const activeVsInactive = sessions.reduce((acc, session) => {
    const totalTime = session.end_time 
      ? differenceInMinutes(new Date(session.end_time), new Date(session.start_time))
      : 0;
    const activeTime = session.active_time_minutes || 0;
    return {
      active: acc.active + activeTime,
      inactive: acc.inactive + (totalTime - activeTime)
    };
  }, { active: 0, inactive: 0 });

  const devices = [...new Set(sessions.map(s => s.device_info?.platform || "Desconhecido"))];

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tempo Total Logado</CardTitle>
            <Clock className="w-4 h-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.floor(totalActiveTime / 60)}h {totalActiveTime % 60}min
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Últimos {Math.ceil(differenceInHours(new Date(filters.endDate), new Date(filters.startDate)) / 24)} dias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Sessões</CardTitle>
            <Monitor className="w-4 h-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSessions}</div>
            <p className="text-xs text-slate-500 mt-1">
              {devices.length} dispositivo(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ações Executadas</CardTitle>
            <Activity className="w-4 h-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActions}</div>
            <p className="text-xs text-slate-500 mt-1">
              Média: {totalSessions > 0 ? Math.round(totalActions / totalSessions) : 0} por sessão
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Último Acesso</CardTitle>
            <Calendar className="w-4 h-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">
              {lastAccess ? format(new Date(lastAccess), "dd/MM/yyyy HH:mm") : "Nunca"}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {user.role === 'admin' ? 'Administrador' : 'Usuário'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tempo Ativo vs Inativo */}
      <Card>
        <CardHeader>
          <CardTitle>Tempo Ativo vs Inativo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Tempo Ativo</span>
                <span className="text-sm text-slate-600">
                  {Math.floor(activeVsInactive.active / 60)}h {activeVsInactive.active % 60}min
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full"
                  style={{ 
                    width: `${totalActiveTime > 0 ? (activeVsInactive.active / totalActiveTime) * 100 : 0}%` 
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Tempo Inativo</span>
                <span className="text-sm text-slate-600">
                  {Math.floor(activeVsInactive.inactive / 60)}h {activeVsInactive.inactive % 60}min
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div 
                  className="bg-orange-500 h-2 rounded-full"
                  style={{ 
                    width: `${totalActiveTime > 0 ? (activeVsInactive.inactive / totalActiveTime) * 100 : 0}%` 
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dispositivos */}
      <Card>
        <CardHeader>
          <CardTitle>Dispositivos Utilizados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {devices.map((device, idx) => (
              <Badge key={idx} variant="outline">
                {device}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}