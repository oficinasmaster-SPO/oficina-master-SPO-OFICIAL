import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  RefreshCw, 
  Download,
  Search,
  Calendar
} from "lucide-react";
import { formatDistance } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function IntegrationSyncLog({ integration }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("7days");

  // Mock data - substituir por dados reais
  const syncLogs = [
    {
      id: "1",
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
      status: "success",
      operation: "sync",
      direction: "import",
      recordsProcessed: 15,
      recordsCreated: 3,
      recordsUpdated: 12,
      recordsFailed: 0,
      duration: 2.3,
      details: "Sincronização completa de eventos do Google Calendar",
    },
    {
      id: "2",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
      status: "success",
      operation: "sync",
      direction: "export",
      recordsProcessed: 8,
      recordsCreated: 5,
      recordsUpdated: 3,
      recordsFailed: 0,
      duration: 1.8,
      details: "Exportação de novos atendimentos",
    },
    {
      id: "3",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
      status: "error",
      operation: "sync",
      direction: "import",
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsFailed: 5,
      duration: 0.5,
      details: "Erro de autenticação: Token expirado",
      error: "Authentication failed: Invalid credentials",
    },
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case "running":
        return <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      success: { variant: "default", className: "bg-green-600" },
      error: { variant: "destructive", className: "" },
      running: { variant: "default", className: "bg-blue-600" },
    };
    const config = variants[status] || { variant: "secondary", className: "" };

    return (
      <Badge variant={config.variant} className={config.className}>
        {status === "success" && "Sucesso"}
        {status === "error" && "Erro"}
        {status === "running" && "Em execução"}
      </Badge>
    );
  };

  const filteredLogs = syncLogs.filter((log) => {
    const matchesSearch = log.details.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Log de Sincronização
            </CardTitle>
            <CardDescription>
              Histórico de todas as operações de sincronização
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            Exportar Logs
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filtros */}
        <div className="flex gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar nos logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="success">Sucesso</SelectItem>
              <SelectItem value="error">Erro</SelectItem>
              <SelectItem value="running">Em execução</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Últimas 24h</SelectItem>
              <SelectItem value="7days">Últimos 7 dias</SelectItem>
              <SelectItem value="30days">Últimos 30 dias</SelectItem>
              <SelectItem value="all">Todo período</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Lista de Logs */}
        <div className="space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>Nenhum log encontrado</p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    {getStatusIcon(log.status)}
                    <div>
                      <p className="font-medium text-gray-900">{log.details}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {formatDistance(log.timestamp, new Date(), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(log.status)}
                </div>

                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Processados:</span>
                    <span className="font-semibold ml-2">{log.recordsProcessed}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Criados:</span>
                    <span className="font-semibold ml-2 text-green-600">
                      +{log.recordsCreated}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Atualizados:</span>
                    <span className="font-semibold ml-2 text-blue-600">
                      {log.recordsUpdated}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Falhas:</span>
                    <span className="font-semibold ml-2 text-red-600">
                      {log.recordsFailed}
                    </span>
                  </div>
                </div>

                {log.error && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    <strong>Erro:</strong> {log.error}
                  </div>
                )}

                <div className="mt-3 pt-3 border-t text-xs text-gray-500">
                  Duração: {log.duration}s | Direção: {log.direction === "import" ? "⬇️ Importar" : "⬆️ Exportar"}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}