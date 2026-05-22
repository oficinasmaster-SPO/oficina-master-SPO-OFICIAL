import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { CheckCircle, XCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWorkshopContext } from "@/components/hooks/useWorkshopContext";
import { format } from "date-fns";

export default function ConciliacaoBancaria() {
  const { workshop } = useWorkshopContext();
  const queryClient = useQueryClient();
  const [bancoSelecionado, setBancoSelecionado] = useState("Itaú");
  const [arquivoUrl, setArquivoUrl] = useState(null);

  const { data: transacoesBanco, isLoading: loadingBanco } = useQuery({
    queryKey: ['bank-transactions', workshop?.id, bancoSelecionado],
    queryFn: async () => {
      if (!workshop?.id) return [];
      return await base44.entities.BankTransaction.filter({
        workshop_id: workshop.id,
        banco: bancoSelecionado
      }, '-data_operacao', 50);
    },
    enabled: !!workshop?.id
  });

  const { data: liquidacoes, isLoading: loadingLiq } = useQuery({
    queryKey: ['liquidacoes', workshop?.id],
    queryFn: async () => {
      if (!workshop?.id) return [];
      return await base44.entities.LiquidacaoFinanceira.filter({
        workshop_id: workshop.id,
        conciliado: false
      }, '-data_liquidacao', 50);
    },
    enabled: !!workshop?.id
  });

  const conciliacaoMutation = useMutation({
    mutationFn: async ({ bank_transaction_id, liquidacao_financeira_id }) => {
      return await base44.functions.invoke('conciliarTransacaoManual', {
        bank_transaction_id,
        liquidacao_financeira_id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['bank-transactions']);
      queryClient.invalidateQueries(['liquidacoes']);
    }
  });

  const importarMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.functions.invoke('importarExtratoBancario', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['bank-transactions']);
    }
  });

  const handleConciliar = (bankTxId, liqId) => {
    conciliacaoMutation.mutate({ bank_transaction_id: bankTxId, liquidacao_financeira_id: liqId });
  };

  const handleImportar = () => {
    if (!arquivoUrl) return;
    importarMutation.mutate({
      arquivo_url: arquivoUrl,
      banco: bancoSelecionado,
      tipo_arquivo: 'ofx'
    });
  };

  const transacoesPendentes = transacoesBanco?.filter(t => t.status_conciliacao === 'pendente') || [];
  const conciliadas = transacoesBanco?.filter(t => t.status_conciliacao === 'conciliado') || [];

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Conciliação Bancária</h1>
        <div className="flex gap-2">
          <Input
            type="file"
            accept=".ofx,.csv"
            onChange={(e) => {
              const file = e.target.files[0];
              if (file) {
                // Upload logic aqui
                setArquivoUrl('url_temporaria');
              }
            }}
            className="w-64"
          />
          <Button onClick={handleImportar} disabled={!arquivoUrl || importarMutation.isPending}>
            <RefreshCw className={`w-4 h-4 mr-2 ${importarMutation.isPending ? 'animate-spin' : ''}`} />
            Importar Extrato
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{transacoesPendentes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Conciliadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{conciliadas.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Taxa Conciliação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {transacoesBanco?.length > 0 ? ((conciliadas.length / transacoesBanco.length) * 100).toFixed(1) : 0}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Liquidações sem Banco</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{liquidacoes?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pendentes">
        <TabsList>
          <TabsTrigger value="pendentes">Pendentes de Conciliação</TabsTrigger>
          <TabsTrigger value="conciliadas">Conciliadas</TabsTrigger>
          <TabsTrigger value="liquidacoes">Liquidações sem Banco</TabsTrigger>
        </TabsList>

        <TabsContent value="pendentes">
          <Card>
            <CardHeader>
              <CardTitle>Transações Bancárias Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transacoesPendentes.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>{format(new Date(tx.data_operacao), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{tx.descricao}</TableCell>
                      <TableCell>R$ {tx.valor?.toFixed(2)}</TableCell>
                      <TableCell>
                        <Select onValueChange={(liqId) => handleConciliar(tx.id, liqId)}>
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Selecionar liquidação" />
                          </SelectTrigger>
                          <SelectContent>
                            {liquidacoes?.map((liq) => (
                              <SelectItem key={liq.id} value={liq.id}>
                                R$ {liq.valor_liquidacao?.toFixed(2)} - {format(new Date(liq.data_liquidacao), 'dd/MM')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conciliadas">
          <Card>
            <CardHeader>
              <CardTitle>Transações Conciliadas</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Conciliado Por</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conciliadas.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>{format(new Date(tx.data_operacao), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{tx.descricao}</TableCell>
                      <TableCell>R$ {tx.valor?.toFixed(2)}</TableCell>
                      <TableCell>{tx.conciliado_por || 'Sistema'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="liquidacoes">
          <Card>
            <CardHeader>
              <CardTitle>Liquidações sem Correspondência Bancária</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Forma Pagamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {liquidacoes?.map((liq) => (
                    <TableRow key={liq.id}>
                      <TableCell>{format(new Date(liq.data_liquidacao), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{liq.tipo}</TableCell>
                      <TableCell>R$ {liq.valor_liquidacao?.toFixed(2)}</TableCell>
                      <TableCell>{liq.forma_pagamento}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}