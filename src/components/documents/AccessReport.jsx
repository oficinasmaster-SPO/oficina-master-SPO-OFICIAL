import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Eye, TrendingUp, Users } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Relatório de acessos e downloads
 */
export default function AccessReport({ document, logs = [], onClose }) {
  if (!document) return null;

  const stats = React.useMemo(() => {
    const totalDownloads = logs.length;
    const uniqueUsers = new Set(logs.map(l => l.user_email)).size;
    const lastAccess = logs.length > 0 
      ? new Date(Math.max(...logs.map(l => new Date(l.download_date))))
      : null;
    
    const userStats = logs.reduce((acc, log) => {
      acc[log.user_email] = (acc[log.user_email] || 0) + 1;
      return acc;
    }, {});

    const topUsers = Object.entries(userStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return { totalDownloads, uniqueUsers, lastAccess, topUsers };
  }, [logs]);

  return (
    <Dialog open={!!document} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Relatório de Acessos: {document.title}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total de Downloads</p>
                  <p className="text-2xl font-bold mt-1">{stats.totalDownloads}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Download className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Usuários Únicos</p>
                  <p className="text-2xl font-bold mt-1">{stats.uniqueUsers}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Último Acesso</p>
                  <p className="text-sm font-medium mt-1">
                    {stats.lastAccess 
                      ? format(stats.lastAccess, "dd/MM/yyyy", { locale: ptBR })
                      : "Nunca"}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <Eye className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {stats.topUsers.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Top 5 Usuários</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.topUsers.map(([email, count], index) => (
                  <div key={email} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">#{index + 1}</Badge>
                      <span className="text-sm font-medium">{email}</span>
                    </div>
                    <Badge>{count} downloads</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico Completo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-gray-500">
                        Nenhum download registrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs
                      .sort((a, b) => new Date(b.download_date) - new Date(a.download_date))
                      .map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm">
                            {format(new Date(log.download_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-sm">{log.user_email}</TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {log.ip_address || "-"}
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}