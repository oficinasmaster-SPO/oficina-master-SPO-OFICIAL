import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function RelatoriosTab({ user }) {
  const [clienteSelecionado, setClienteSelecionado] = useState("");
  const [gerando, setGerando] = useState(false);

  const { data: workshops } = useQuery({
    queryKey: ['workshops-relatorios'],
    queryFn: async () => {
      const all = await base44.entities.Workshop.list();
      return all.filter(w => w.planoAtual && w.planoAtual !== 'FREE');
    }
  });

  const gerarRelatorioCompleto = async () => {
    if (!clienteSelecionado) {
      toast.error('Selecione um cliente');
      return;
    }

    setGerando(true);
    try {
      toast.info('Gerando relatório completo...');
      const response = await base44.functions.invoke('gerarRelatorioCliente', {
        workshop_id: clienteSelecionado
      });

      // Download do PDF
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Relatorio_Completo_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      toast.success('Relatório gerado com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar relatório: ' + error.message);
    } finally {
      setGerando(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gerar Relatório Completo do Cliente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={clienteSelecionado} onValueChange={setClienteSelecionado}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um cliente" />
            </SelectTrigger>
            <SelectContent>
              {workshops?.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name} - {w.planoAtual}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button 
            onClick={gerarRelatorioCompleto} 
            disabled={!clienteSelecionado || gerando}
            className="w-full"
          >
            {gerando ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Gerar Relatório PDF
              </>
            )}
          </Button>

          <p className="text-sm text-gray-600">
            O relatório incluirá: dados cadastrais, gráficos de evolução, atas de reuniões, 
            cronograma de tarefas e status de pendências.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tipos de Relatórios Disponíveis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Relatório de Progresso</p>
                <p className="text-sm text-gray-600">Status dos módulos e tarefas</p>
              </div>
              <Button variant="outline" size="sm">
                <FileText className="w-4 h-4 mr-2" />
                Gerar
              </Button>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Relatório Financeiro</p>
                <p className="text-sm text-gray-600">Metas, faturamento e evolução</p>
              </div>
              <Button variant="outline" size="sm">
                <FileText className="w-4 h-4 mr-2" />
                Gerar
              </Button>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Histórico de Atendimentos</p>
                <p className="text-sm text-gray-600">Todas as reuniões e atas</p>
              </div>
              <Button variant="outline" size="sm">
                <FileText className="w-4 h-4 mr-2" />
                Gerar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}