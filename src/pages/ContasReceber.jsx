import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Download, CheckCircle, XCircle, AlertCircle, RefreshCw } from "lucide-react";
import { useWorkshopContext } from "@/components/hooks/useWorkshopContext";
import InputMoeda from "@/components/ui/InputMoeda";

export default function ContasReceber() {
  const { workshop } = useWorkshopContext();
  const queryClient = useQueryClient();
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroCliente, setFiltroCliente] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [contaSelecionada, setContaSelecionada] = useState(null);

  const { data: contas, isLoading } = useQuery({
    queryKey: ['contas-receber', workshop?.id, filtroStatus],
    queryFn: async () => {
      if (!workshop?.id) return [];
      const query = { workshop_id: workshop.id };
      if (filtroStatus !== "todos") query.status = filtroStatus;
      return await base44.entities.ContaReceber.filter(query, '-data_vencimento', 100);
    },
    enabled: !!workshop?.id
  });

  const totalAberto = contas?.filter(c => c.status === 'aberto').reduce((sum, c) => sum + c.valor_aberto, 0) || 0;
  const totalVencido = contas?.filter(c => c.status === 'vencido').reduce((sum, c) => sum + c.valor_aberto, 0) || 0;

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Contas a Receber</h1>
        <Button onClick={() => setModalOpen(true)}>
          <Download className="w-4 h-4 mr-2" />
          Exportar
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Aberto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {totalAberto.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Vencido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">R$ {totalVencido.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Contas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contas?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Inadimplência</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalAberto > 0 ? ((totalVencido / totalAberto) * 100).toFixed(1) : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 mb-6">
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="aberto">Aberto</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
            <SelectItem value="vencido">Vencido</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Filtrar por cliente..."
          value={filtroCliente}
          onChange={(e) => setFiltroCliente(e.target.value)}
          className="w-64"
        />
      </div>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Contas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Valor Original</TableHead>
                <TableHead>Valor Aberto</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contas?.map((conta) => (
                <TableRow key={conta.id}>
                  <TableCell>{conta.cliente_nome}</TableCell>
                  <TableCell>{format(new Date(conta.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                  <TableCell>R$ {conta.valor_original?.toFixed(2)}</TableCell>
                  <TableCell>R$ {conta.valor_aberto?.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={conta.status === 'pago' ? 'default' : conta.status === 'vencido' ? 'destructive' : 'secondary'}>
                      {conta.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => setContaSelecionada(conta)}>
                      Ver
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Detalhes */}
      {contaSelecionada && (
        <Dialog open={!!contaSelecionada} onOpenChange={() => setContaSelecionada(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Detalhes da Conta</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Cliente</label>
                <p className="text-lg">{contaSelecionada.cliente_nome}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Valor Original</label>
                  <p className="text-lg">R$ {contaSelecionada.valor_original?.toFixed(2)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Valor Aberto</label>
                  <p className="text-lg">R$ {contaSelecionada.valor_aberto?.toFixed(2)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Vencimento</label>
                  <p>{format(new Date(contaSelecionada.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Badge>{contaSelecionada.status}</Badge>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}