import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Clock, CheckCircle2, XCircle, Send, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function InviteStatsSection() {
  const { data: invites = [], isLoading, refetch } = useQuery({
    queryKey: ['employee-invites-stats'],
    queryFn: async () => {
      const data = await base44.entities.EmployeeInvite.list('-created_date', 500);
      return Array.isArray(data) ? data : [];
    },
    staleTime: 2 * 60 * 1000,
  });

  const now = new Date();

  const stats = React.useMemo(() => {
    const enviados = invites.filter(i => i.status === 'enviado');
    const acessados = invites.filter(i => i.status === 'acessado');
    const concluidos = invites.filter(i => i.status === 'concluido');
    const expirados = invites.filter(i => i.status === 'expirado');
    // Pendentes ainda válidos (status enviado/acessado e expires_at no futuro)
    const pendentesValidos = enviados.filter(i => !i.expires_at || new Date(i.expires_at) > now);
    // Expirados de fato mas status não atualizado ainda
    const expiradosSemStatus = enviados.filter(i => i.expires_at && new Date(i.expires_at) <= now);

    return {
      total: invites.length,
      enviados: enviados.length,
      acessados: acessados.length,
      concluidos: concluidos.length,
      expirados: expirados.length + expiradosSemStatus.length,
      pendentesValidos: pendentesValidos.length,
      reenviados: invites.filter(i => (i.resent_count || 0) > 0).length,
    };
  }, [invites]);

  // Últimos 10 convites pendentes
  const pendentes = React.useMemo(() => {
    return invites
      .filter(i => i.status === 'enviado' && (!i.expires_at || new Date(i.expires_at) > now))
      .slice(0, 10);
  }, [invites]);

  const statusColor = {
    enviado: 'bg-yellow-100 text-yellow-700',
    acessado: 'bg-blue-100 text-blue-700',
    concluido: 'bg-green-100 text-green-700',
    expirado: 'bg-red-100 text-red-700',
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const daysLeft = (expires_at) => {
    if (!expires_at) return null;
    const diff = Math.ceil((new Date(expires_at) - now) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Estatísticas de Convites</h2>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-3 h-3 mr-1" />
          Atualizar
        </Button>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Mail className="w-4 h-4 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500">Total enviados</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-yellow-50 rounded-lg">
              <Clock className="w-4 h-4 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-700">{stats.pendentesValidos}</p>
              <p className="text-xs text-gray-500">Aguardando aceite</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">{stats.concluidos}</p>
              <p className="text-xs text-gray-500">Concluídos</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <XCircle className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-700">{stats.expirados}</p>
              <p className="text-xs text-gray-500">Expirados</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de convites pendentes */}
      {pendentes.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Send className="w-4 h-4" />
              Convites Pendentes ({stats.pendentesValidos})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50/50">
                    <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600">Nome</th>
                    <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600">Email</th>
                    <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600">Status</th>
                    <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600">Expira em</th>
                    <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600">Reenvios</th>
                  </tr>
                </thead>
                <tbody>
                  {pendentes.map((invite) => {
                    const dias = daysLeft(invite.expires_at);
                    return (
                      <tr key={invite.id} className="border-b hover:bg-gray-50/50">
                        <td className="py-2 px-4 text-sm font-medium text-gray-900">{invite.name || '—'}</td>
                        <td className="py-2 px-4 text-sm text-gray-600">{invite.email}</td>
                        <td className="py-2 px-4">
                          <Badge className={`text-xs ${statusColor[invite.status] || 'bg-gray-100 text-gray-700'}`}>
                            {invite.status}
                          </Badge>
                        </td>
                        <td className="py-2 px-4 text-sm">
                          {dias !== null ? (
                            <span className={dias <= 2 ? 'text-red-600 font-medium' : 'text-gray-600'}>
                              {dias <= 0 ? 'Hoje' : `${dias}d`} ({formatDate(invite.expires_at)})
                            </span>
                          ) : '—'}
                        </td>
                        <td className="py-2 px-4 text-sm text-gray-600">
                          {invite.resent_count || 0}x
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}