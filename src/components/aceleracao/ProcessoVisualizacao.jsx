import React, { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Eye, Calendar, Lock, Save } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export default function ProcessoVisualizacao({ processo, user, isAdmin }) {
  const queryClient = useQueryClient();
  const [dataConclusaoCliente, setDataConclusaoCliente] = React.useState(
    processo.data_conclusao_cliente || ""
  );
  const [justificativa, setJustificativa] = React.useState(processo.justificativa_prazo || "");

  // Registrar visualização automática e definir prazo +30 dias
  useEffect(() => {
    const registrarVisualizacao = async () => {
      // Só registrar se for cliente (não admin) e não tiver sido visualizado ainda
      if (!isAdmin && !processo.data_visualizacao) {
        try {
          const dataInicio = new Date();
          const dataTermino = new Date(dataInicio);
          dataTermino.setDate(dataTermino.getDate() + 30); // +30 dias automático

          await base44.entities.CronogramaProgresso.update(processo.id, {
            data_visualizacao: dataInicio.toISOString(),
            data_inicio_realizado: dataInicio.toISOString().split('T')[0],
            data_conclusao_previsto: dataTermino.toISOString().split('T')[0],
            situacao: 'em_andamento',
            notificacao_diaria_ativa: true
          });
          queryClient.invalidateQueries(['cronograma-progresso']);
          toast.success("Processo iniciado! Prazo: 30 dias.");
        } catch (error) {
          console.error("Erro ao registrar visualização:", error);
        }
      }
    };

    registrarVisualizacao();
  }, [processo.id, processo.data_visualizacao, isAdmin, queryClient]);

  const updatePrazoMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.CronogramaProgresso.update(processo.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['cronograma-progresso']);
      toast.success("Prazo atualizado com sucesso!");
    }
  });

  const handleSalvarPrazo = () => {
    if (!dataConclusaoCliente) {
      toast.error("Informe a data de conclusão prevista");
      return;
    }

    updatePrazoMutation.mutate({
      data_conclusao_cliente: dataConclusaoCliente,
      justificativa_prazo: justificativa
    });
  };

  const getTipoIcon = (tipo) => {
    const icons = {
      processo: "📋",
      diagnostico: "🔍",
      teste: "✅"
    };
    return icons[tipo] || "📋";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{getTipoIcon(processo.tipo_conteudo)}</span>
          <div className="flex-1">
            <CardTitle>{processo.modulo_nome}</CardTitle>
            <p className="text-sm text-gray-600">Código: {processo.modulo_codigo}</p>
          </div>
          <Badge className={getSituacaoColor(processo.situacao)}>
            {processo.situacao.replace(/_/g, ' ')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Datas - Bloqueadas para Cliente */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-gray-400" />
              Data Início (Automático)
            </Label>
            <Input
              type="date"
              value={processo.data_inicio_realizado || ""}
              disabled={true}
              className="bg-gray-50 cursor-not-allowed"
            />
            {processo.data_visualizacao && (
              <p className="text-xs text-gray-500 mt-1">
                Visualizado em: {format(new Date(processo.data_visualizacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            )}
          </div>

          <div>
            <Label>Data Conclusão Prevista (Editável)</Label>
            <Input
              type="date"
              value={dataConclusaoCliente}
              onChange={(e) => setDataConclusaoCliente(e.target.value)}
              disabled={isAdmin}
              className={isAdmin ? "bg-gray-50 cursor-not-allowed" : ""}
            />
          </div>
        </div>

        {/* Justificativa */}
        {!isAdmin && (
          <div>
            <Label>Justificativa (Opcional)</Label>
            <Textarea
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Por que você precisa de mais tempo para concluir este processo?"
              rows={3}
            />
          </div>
        )}

        {/* Progresso */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Atividades Realizadas</Label>
            <div className="text-2xl font-bold text-blue-600">
              {processo.atividades_realizadas || 0} / {processo.atividades_previstas || 0}
            </div>
          </div>
          <div>
            <Label>Tarefas Entregues</Label>
            <div className="text-2xl font-bold text-green-600">
              {processo.tarefas_entregues || 0} / {processo.tarefas_solicitadas || 0}
            </div>
          </div>
        </div>

        {/* Ações */}
        {!isAdmin && (
          <Button onClick={handleSalvarPrazo} disabled={updatePrazoMutation.isPending} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            {updatePrazoMutation.isPending ? "Salvando..." : "Salvar Prazo"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function getSituacaoColor(situacao) {
  const colors = {
    nao_iniciado: "bg-gray-100 text-gray-800",
    em_andamento: "bg-blue-100 text-blue-800",
    concluido: "bg-green-100 text-green-800",
    cancelado: "bg-red-100 text-red-800",
    atrasado: "bg-orange-100 text-orange-800"
  };
  return colors[situacao] || colors.nao_iniciado;
}