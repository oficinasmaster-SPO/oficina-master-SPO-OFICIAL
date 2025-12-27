import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, FileText, Eye, Shield } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AuditoriaProcessos() {
  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      const workshops = await base44.entities.Workshop.filter({ owner_id: currentUser.id });
      setWorkshop(workshops[0]);
    } catch (e) {
      console.error(e);
    }
  };

  const { data: auditLogs = [], isLoading } = useQuery({
    queryKey: ['process-audit', workshop?.id],
    queryFn: async () => {
      if (!workshop?.id) return [];
      const logs = await base44.entities.ProcessAudit.filter({ workshop_id: workshop.id });
      return logs.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!workshop?.id
  });

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = 
      log.process_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.process_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.performed_by_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  const actionColors = {
    criacao: "bg-green-100 text-green-700",
    edicao: "bg-blue-100 text-blue-700",
    exclusao: "bg-red-100 text-red-700",
    visualizacao: "bg-gray-100 text-gray-700",
    compartilhamento: "bg-purple-100 text-purple-700",
    aprovacao: "bg-teal-100 text-teal-700",
    revisao: "bg-yellow-100 text-yellow-700"
  };

  if (!user || !workshop) {
    return <div className="p-8 text-center">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-8 h-8 text-blue-600" />
            Auditoria de Processos
          </h1>
          <p className="text-gray-600">Rastreamento completo de ações nos MAPs</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por processo, código ou usuário..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar ação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Ações</SelectItem>
                  <SelectItem value="criacao">Criação</SelectItem>
                  <SelectItem value="edicao">Edição</SelectItem>
                  <SelectItem value="visualizacao">Visualização</SelectItem>
                  <SelectItem value="compartilhamento">Compartilhamento</SelectItem>
                  <SelectItem value="exclusao">Exclusão</SelectItem>
                  <SelectItem value="aprovacao">Aprovação</SelectItem>
                  <SelectItem value="revisao">Revisão</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Processo</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Usuário</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        Nenhum registro encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs">
                          {format(new Date(log.created_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Badge className={actionColors[log.action]}>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{log.process_title}</TableCell>
                        <TableCell className="font-mono text-xs">{log.process_code || "-"}</TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{log.performed_by_name}</p>
                            <p className="text-xs text-gray-500">{log.performed_by}</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}