import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, Calendar, Clock, Tag, AlertCircle, FileText, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const STATUS_CONFIG = {
  aberta:      { label: "Aberta",       className: "bg-gray-100 text-gray-800" },
  em_execucao: { label: "Em Execução",  className: "bg-blue-100 text-blue-800" },
  bloqueada:   { label: "Bloqueada",    className: "bg-red-100 text-red-800" },
  concluida:   { label: "Concluída",    className: "bg-green-100 text-green-800" },
};

const PRIORIDADE_CONFIG = {
  baixa:   { label: "Baixa",   className: "bg-blue-100 text-blue-800" },
  media:   { label: "Média",   className: "bg-yellow-100 text-yellow-800" },
  alta:    { label: "Alta",    className: "bg-orange-100 text-orange-800" },
  critica: { label: "Crítica", className: "bg-red-100 text-red-800" },
};

const ACAO_CONFIG = {
  CRIACAO:        { cor: "bg-green-500",  icone: "🟢", label: "Criado" },
  ATRIBUICAO:     { cor: "bg-yellow-500", icone: "🟡", label: "Atribuído" },
  MUDANCA_STATUS: { cor: "bg-blue-500",   icone: "🔵", label: "Status alterado" },
  CONCLUSAO:      { cor: "bg-red-500",    icone: "🔴", label: "Concluído" },
  EDICAO:         { cor: "bg-purple-500", icone: "🟣", label: "Editado" },
  BLOQUEIO:       { cor: "bg-orange-500", icone: "🟠", label: "Bloqueado" },
};

function TimelineItem({ evento }) {
  const config = ACAO_CONFIG[evento.acao] || { cor: "bg-gray-400", icone: "⚪", label: evento.acao };
  const dataHora = evento.data_hora ? new Date(evento.data_hora) : null;

  return (
    <div className="flex gap-3 relative">
      {/* linha vertical */}
      <div className="flex flex-col items-center">
        <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${config.cor}`} />
        <div className="w-px flex-1 bg-gray-200 mt-1" />
      </div>

      <div className="pb-5 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="font-medium text-sm text-gray-900">{config.icone} {config.label}</span>
            {evento.usuario_nome && (
              <span className="text-sm text-gray-600"> por <strong>{evento.usuario_nome}</strong></span>
            )}
            {(evento.valor_anterior || evento.valor_novo) && (
              <div className="mt-1 text-xs text-gray-500 space-x-2">
                {evento.valor_anterior && (
                  <span className="line-through text-red-400">{evento.valor_anterior}</span>
                )}
                {evento.valor_anterior && evento.valor_novo && <span>→</span>}
                {evento.valor_novo && (
                  <span className="text-green-600 font-medium">{evento.valor_novo}</span>
                )}
              </div>
            )}
            {evento.campo && evento.campo !== 'geral' && (
              <p className="text-xs text-gray-400 mt-0.5">Campo: {evento.campo}</p>
            )}
          </div>
          {dataHora && (
            <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
              {format(dataHora, "dd/MM HH:mm", { locale: ptBR })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TarefaBacklogDetalhe({ tarefa, onVoltar, onEditar, onConcluir }) {
  const [criadoPorNome, setCriadoPorNome] = useState(null);

  // Buscar nome de quem criou a tarefa
  useEffect(() => {
    const buscarNomeCriador = async () => {
      if (!tarefa.criado_por_id) return;
      try {
        const usuarios = await base44.entities.User.filter({ id: tarefa.criado_por_id });
        if (usuarios.length > 0) {
          setCriadoPorNome(usuarios[0].full_name || usuarios[0].email);
        }
      } catch (err) {
        console.error("Erro ao buscar criador:", err);
      }
    };
    buscarNomeCriador();
  }, [tarefa.criado_por_id]);

  // Mutation para concluir tarefa
  const concludirMutation = useMutation({
    mutationFn: async () => {
      return await base44.entities.TarefaBacklog.update(tarefa.id, {
        status: 'concluida',
        data_conclusao: new Date().toISOString()
      });
    },
    onSuccess: () => {
      toast.success('Tarefa concluída com sucesso!');
      if (onConcluir) onConcluir();
      onVoltar();
    },
    onError: (error) => {
      toast.error('Erro ao concluir tarefa');
      console.error(error);
    }
  });

  const { data: historico = [], isLoading: loadingHistorico } = useQuery({
    queryKey: ["tarefa-historico", tarefa.id],
    queryFn: async () => {
      const all = await base44.entities.TarefaBacklogHistorico.filter(
        { tarefa_id: tarefa.id },
        "data_hora"
      );
      return all || [];
    },
    enabled: !!tarefa.id,
  });

  const statusCfg = STATUS_CONFIG[tarefa.status] || STATUS_CONFIG.aberta;
  const prioridadeCfg = PRIORIDADE_CONFIG[tarefa.prioridade] || PRIORIDADE_CONFIG.media;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onVoltar}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-bold">{tarefa.titulo}</h2>
          <p className="text-sm text-gray-500">ID: {tarefa.id}</p>
        </div>
        <div className="flex gap-2">
          {tarefa.status !== 'concluida' && (
            <Button 
              variant="default" 
              size="sm"
              onClick={() => concludirMutation.mutate()}
              disabled={concludirMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              {concludirMutation.isPending ? 'Concluindo...' : 'Concluir Tarefa'}
            </Button>
          )}
          {onEditar && (
            <Button variant="outline" size="sm" onClick={() => onEditar(tarefa)}>
              Editar
            </Button>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Dados Gerais */}
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" /> Dados Gerais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {tarefa.descricao && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Descrição</p>
                  <p className="text-sm text-gray-800">{tarefa.descricao}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Cliente</p>
                  <p className="text-sm font-medium">{tarefa.cliente_nome || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Origem</p>
                  <Badge variant="outline" className="text-xs capitalize">{tarefa.origem}</Badge>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Prazo</p>
                  <p className="text-sm font-medium flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {tarefa.prazo ? format(new Date(tarefa.prazo), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Tempo Estimado</p>
                  <p className="text-sm font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {tarefa.tempo_estimado_horas}h
                    {tarefa.tempo_real_horas ? ` / real: ${tarefa.tempo_real_horas}h` : ""}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Impacto</p>
                  <p className="text-sm capitalize">{tarefa.impacto || "—"}</p>
                </div>
                {tarefa.motivo_bloqueio && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-red-500" /> Motivo do Bloqueio
                    </p>
                    <p className="text-sm text-red-700">{tarefa.motivo_bloqueio}</p>
                  </div>
                )}
                {tarefa.notas && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500 mb-1">Notas</p>
                    <p className="text-sm text-gray-600">{tarefa.notas}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Responsável */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4" /> Responsáveis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Consultor</p>
                  <p className="text-sm font-medium">{tarefa.consultor_nome || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Atribuído para</p>
                  <p className="text-sm font-medium">{tarefa.atribuido_para_id || "—"}</p>
                </div>
                <div>
                    <p className="text-xs text-gray-500 mb-1">Criado por</p>
                    <Badge variant="secondary" className="text-xs">
                      <User className="w-3 h-3 mr-1" />
                      {criadoPorNome || tarefa.created_by?.split('@')[0] || "—"}
                    </Badge>
                  </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Solicitante</p>
                  <p className="text-sm">{tarefa.solicitante_id || "—"}</p>
                </div>
                {tarefa.data_atribuicao && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Data Atribuição</p>
                    <p className="text-sm">
                      {format(new Date(tarefa.data_atribuicao), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                )}
                {tarefa.data_conclusao && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Data Conclusão</p>
                    <p className="text-sm text-green-700 font-medium">
                      {format(new Date(tarefa.data_conclusao), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status + Histórico */}
        <div className="space-y-4">
          {/* Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="w-4 h-4" /> Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">Status Atual</p>
                <Badge className={statusCfg.className}>{statusCfg.label}</Badge>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Prioridade</p>
                <Badge className={prioridadeCfg.className}>{prioridadeCfg.label}</Badge>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Criado em</p>
                <p className="text-xs text-gray-700">
                  {tarefa.data_criacao
                    ? format(new Date(tarefa.data_criacao), "dd/MM/yyyy HH:mm", { locale: ptBR })
                    : tarefa.created_date
                    ? format(new Date(tarefa.created_date), "dd/MM/yyyy HH:mm", { locale: ptBR })
                    : "—"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Histórico / Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">📋 Histórico</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingHistorico ? (
                <p className="text-sm text-gray-400 text-center py-4">Carregando...</p>
              ) : historico.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Nenhum evento registrado ainda.</p>
              ) : (
                <div className="max-h-80 overflow-y-auto pr-1">
                  {historico.map((evento) => (
                    <TimelineItem key={evento.id} evento={evento} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}