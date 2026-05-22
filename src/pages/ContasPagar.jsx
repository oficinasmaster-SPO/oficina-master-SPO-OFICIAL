import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Download } from "lucide-react";
import { useWorkshopContext } from "@/components/hooks/useWorkshopContext";

export default function ContasPagar() {
  const { workshop } = useWorkshopContext();
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroFornecedor, setFiltroFornecedor] = useState("");

  const { data: contas, isLoading } = useQuery({
    queryKey: ['contas-pagar', workshop?.id, filtroStatus],
    queryFn: async () => {
      if (!workshop?.id) return [];
      const query = { workshop_id: workshop.id };
      if (filtroStatus !== "todos") query.status = filtroStatus;
      return await base44.entities.ContaPagar.filter(query, '-data_vencimento', 100);
    },
    enabled: !!workshop?.id
  });

  const totalAberto = contas?.filter(c => c.status === 'aberto').reduce((sum, c) => sum + c.valor_aberto, 0) || 0;
  const totalVencido = contas?.filter(c => c.status === 'vencido').reduce((sum, c) => sum + c.valor_aberto, 0) || 0;

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Contas a Pagar</h1>
        <Button>
          <Download className="w-4 h-4 mr-2" />
          Exportar
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
                <TableHead>Fornecedor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Valor Original</TableHead>
                <TableHead>Valor Aberto</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contas?.map((conta) => (
                <TableRow key={conta.id}>
                  <TableCell>{conta.fornecedor_nome}</TableCell>
                  <TableCell>{format(new Date(conta.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                  <TableCell>{conta.categoria}</TableCell>
                  <TableCell>R$ {conta.valor_original?.toFixed(2)}</TableCell>
                  <TableCell>R$ {conta.valor_aberto?.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={conta.status === 'pago' ? 'default' : conta.status === 'vencido' ? 'destructive' : 'secondary'}>
                      {conta.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}