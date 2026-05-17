import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText, TrendingUp, DollarSign, PieChart, Calendar } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const formatarMoeda = (valor) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
};

export default function RelatorioAnualViewer({ workshopId }) {
  const [ano, setAno] = useState(new Date().getFullYear().toString());
  const [tipo, setTipo] = useState("dre");

  // Buscar anos disponíveis
  const { data: anosDisponiveis = [] } = useQuery({
    queryKey: ['anos-disponiveis', workshopId],
    queryFn: async () => {
      const dre = await base44.entities.DRELancamento.filter({ workshop_id: workshopId }, '-mes', 1000);
      const anos = [...new Set(dre.map(d => d.mes.split('-')[0]))];
      return anos.sort().reverse();
    }
  });

  // Dados DRE
  const { data: dreData, isLoading: loadingDRE } = useQuery({
    queryKey: ['dre-anual', workshopId, ano],
    queryFn: async () => {
      const response = await base44.functions.invoke('getDREDataAnual', { ano, workshop_id: workshopId });
      return response.data;
    },
    enabled: !!workshopId && !!ano && tipo === 'dre'
  });

  // Dados DFC
  const { data: dfcData, isLoading: loadingDFC } = useQuery({
    queryKey: ['dfc-anual', workshopId, ano],
    queryFn: async () => {
      const response = await base44.functions.invoke('getDFCDataAnual', { ano, workshop_id: workshopId });
      return response.data;
    },
    enabled: !!workshopId && !!ano && tipo === 'dfc'
  });

  // Projeção
  const { data: projecaoData, isLoading: loadingProjecao } = useQuery({
    queryKey: ['projecao-anual', workshopId],
    queryFn: async () => {
      const response = await base44.functions.invoke('projecaoAnual', { 
        workshop_id: workshopId, 
        meses_futuros: 12,
        considerar_sazonalidade: true 
      });
      return response.data;
    },
    enabled: !!workshopId && tipo === 'projecao'
  });

  // Gerar PDF DRE
  const gerarPDFDRE = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('gerarRelatorioAnualDRE', { ano, workshop_id: workshopId });
      return response.data;
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dre-anual-${ano}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    }
  });

  // Gerar PDF DFC
  const gerarPDFDFC = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('gerarRelatorioAnualDFC', { ano, workshop_id: workshopId });
      return response.data;
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dfc-anual-${ano}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    }
  });

  // Exportar Excel
  const exportarExcel = () => {
    const dados = tipo === 'dre' ? dreData : tipo === 'dfc' ? dfcData : projecaoData;
    if (!dados) return;

    let csv = "Mês;Receitas;Despesas;Lucro;Margem\n";
    if (dados.meses || dados.projecao) {
      const lista = dados.meses || dados.projecao;
      lista.forEach(m => {
        csv += `${m.mes_nome};${m.total_receitas || m.receitas};${m.total_despesas || m.despesas};${m.lucro};${m.margem}%\n`;
      });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-${tipo}-${ano}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Relatórios Anuais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Tipo de Relatório</label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dre">DRE (Demonstrativo Resultado)</SelectItem>
                  <SelectItem value="dfc">DFC (Fluxo de Caixa)</SelectItem>
                  <SelectItem value="projecao">Projeção 12 Meses</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Ano</label>
              <Select value={ano} onValueChange={setAno}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {anosDisponiveis.map(a => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              {tipo === 'dre' && (
                <Button onClick={() => gerarPDFDRE.mutate()} disabled={gerarPDFDRE.isPending}>
                  <Download className="w-4 h-4 mr-2" />
                  PDF DRE
                </Button>
              )}
              {tipo === 'dfc' && (
                <Button onClick={() => gerarPDFDFC.mutate()} disabled={gerarPDFDFC.isPending}>
                  <Download className="w-4 h-4 mr-2" />
                  PDF DFC
                </Button>
              )}
              <Button variant="outline" onClick={exportarExcel}>
                <Download className="w-4 h-4 mr-2" />
                Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DRE */}
      {tipo === 'dre' && dreData && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Receitas Anuais</CardTitle>
                <DollarSign className="w-4 h-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatarMoeda(dreData.total_anual.receitas)}</div>
                <p className="text-xs text-muted-foreground">Média: {formatarMoeda(dreData.media_mensal.receitas)}/mês</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Despesas Anuais</CardTitle>
                <DollarSign className="w-4 h-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatarMoeda(dreData.total_anual.despesas)}</div>
                <p className="text-xs text-muted-foreground">Média: {formatarMoeda(dreData.media_mensal.despesas)}/mês</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Lucro Anual</CardTitle>
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatarMoeda(dreData.total_anual.lucro)}</div>
                <p className="text-xs text-muted-foreground">Média: {formatarMoeda(dreData.media_mensal.lucro)}/mês</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Margem Média</CardTitle>
                <PieChart className="w-4 h-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dreData.total_anual.margem.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">Rentabilidade anual</p>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico Mensal */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Evolução Mensal - {ano}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dreData.meses}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes_nome" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatarMoeda(value)} />
                  <Legend />
                  <Bar dataKey="receitas" fill="#22c55e" name="Receitas" />
                  <Bar dataKey="despesas" fill="#ef4444" name="Despesas" />
                  <Bar dataKey="lucro" fill="#3b82f6" name="Lucro" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Tabela de Categorias */}
          <Card>
            <CardHeader>
              <CardTitle>Principais Categorias</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {dreData.categorias.slice(0, 10).map((cat, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 border-b last:border-0">
                    <div>
                      <p className="font-medium">{cat.label}</p>
                      <p className="text-xs text-muted-foreground">{cat.tipo === 'receita' ? 'Receita' : 'Despesa'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatarMoeda(cat.total)}</p>
                      <p className="text-xs text-muted-foreground">
                        {((cat.total / (cat.tipo === 'receita' ? dreData.total_anual.receitas : dreData.total_anual.despesas)) * 100).toFixed(1)}% do total
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* DFC */}
      {tipo === 'dfc' && dfcData && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Fluxo Operacional</CardTitle>
                <DollarSign className="w-4 h-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatarMoeda(dfcData.total_anual.operacional)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Fluxo Investimento</CardTitle>
                <DollarSign className="w-4 h-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatarMoeda(dfcData.total_anual.investimento)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Saldo Final</CardTitle>
                <TrendingUp className="w-4 h-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatarMoeda(dfcData.total_anual.saldo_final)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico por Grupo */}
          <Card>
            <CardHeader>
              <CardTitle>Evolução Mensal por Grupo</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dfcData.meses}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes_nome" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatarMoeda(value)} />
                  <Legend />
                  <Bar dataKey="operacional" fill="#22c55e" name="Operacional" />
                  <Bar dataKey="investimento" fill="#3b82f6" name="Investimento" />
                  <Bar dataKey="financiamento" fill="#f59e0b" name="Financiamento" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* PROJEÇÃO */}
      {tipo === 'projecao' && projecaoData && (
        <div className="space-y-6">
          {/* KPIs Projeção */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Receitas Projetadas (12 meses)</CardTitle>
                <DollarSign className="w-4 h-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatarMoeda(projecaoData.totais.receitas)}</div>
                <p className="text-xs text-muted-foreground">Média: {formatarMoeda(projecaoData.totais.media_mensal_receitas)}/mês</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Despesas Projetadas (12 meses)</CardTitle>
                <DollarSign className="w-4 h-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatarMoeda(projecaoData.totais.despesas)}</div>
                <p className="text-xs text-muted-foreground">Média: {formatarMoeda(projecaoData.totais.media_mensal_despesas)}/mês</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Lucro Projetado (12 meses)</CardTitle>
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatarMoeda(projecaoData.totais.lucro)}</div>
                <p className="text-xs text-muted-foreground">Média: {formatarMoeda(projecaoData.totais.media_mensal_lucro)}/mês</p>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de Projeção */}
          <Card>
            <CardHeader>
              <CardTitle>Projeção para Próximos 12 Meses</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={projecaoData.projecao}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes_nome" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatarMoeda(value)} />
                  <Legend />
                  <Line type="monotone" dataKey="total_receitas" stroke="#22c55e" name="Receitas" strokeWidth={2} />
                  <Line type="monotone" dataKey="total_despesas" stroke="#ef4444" name="Despesas" strokeWidth={2} />
                  <Line type="monotone" dataKey="lucro" stroke="#3b82f6" name="Lucro" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detalhamento da Projeção</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {projecaoData.projecao.map((mes, idx) => (
                  <div key={idx} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-semibold">{mes.mes_nome}</h4>
                      <span className={`text-sm font-medium ${mes.lucro >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        Lucro: {formatarMoeda(mes.lucro)} ({mes.margem.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-green-600">Receitas: {formatarMoeda(mes.total_receitas)}</div>
                      <div className="text-red-600">Despesas: {formatarMoeda(mes.total_despesas)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}