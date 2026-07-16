import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, User, Calendar, Clock, Tag, AlertCircle, FileText, CheckCircle, ExternalLink, Play, Lock, Paperclip } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import TarefaBacklogAnexosVisualizador from "./TarefaBacklogAnexosVisualizador";
import TarefaBacklogMediaUpload from "./TarefaBacklogMediaUpload";
import OrigemPedidoBanner from "./banners/OrigemPedidoBanner";

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
    <div className="relative border-l border-gray-200 pb-4 pl-5 last:border-l-transparent last:pb-0">
      <div className={`absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-white ${config.cor}`} />
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800">
            {config.label}
            {evento.usuario_nome && <span className="ml-1 font-normal text-gray-500">por {evento.usuario_nome.split(' ')[0]}</span>}
          </p>
          {(evento.valor_anterior || evento.valor_novo) && (
            <p className="mt-0.5 truncate text-xs text-gray-500">
              {evento.valor_anterior && <span className="line-through text-red-400">{evento.valor_anterior}</span>}
              {evento.valor_anterior && evento.valor_novo && " → "}
              {evento.valor_novo && <span className="font-medium text-green-600">{evento.valor_novo}</span>}
            </p>
          )}
        </div>
        {dataHora && <time className="shrink-0 text-xs text-gray-400">{format(dataHora, "dd/MM/yyyy HH:mm", { locale: ptBR })}</time>}
      </div>
    </div>
  );
}

export default function TarefaBacklogDetalhe({ tarefa, user, onVoltar, onEditar, onConcluir }) {
  const [criadoPorNome, setCriadoPorNome] = useState(null);
  const [atribuidoParaNome, setAtribuidoParaNome] = useState(null);
  const [solicitanteNome, setSolicitanteNome] = useState(null);

  // Painel de execução do executor (não-criador)
  const [notasExecucao, setNotasExecucao] = useState(tarefa?.notas || '');
  const [anexosExecucao, setAnexosExecucao] = useState(tarefa?.anexos || []);
  const [motivoBloqueio, setMotivoBloqueio] = useState(tarefa?.motivo_bloqueio || '');
  const [showBloquearForm, setShowBloquearForm] = useState(false);

  const queryClient = useQueryClient();

  // Buscar nomes de usuários pelo ID (criadoPor, atribuidoPara, solicitante) em paralelo
  useEffect(() => {
    const buscarNomes = async () => {
      const ids = [
        { id: tarefa.created_by_id, setter: setCriadoPorNome },
        { id: tarefa.assigned_to_id, setter: setAtribuidoParaNome },
        { id: tarefa.requester_id, setter: setSolicitanteNome },
      ].filter(({ id }) => !!id);

      await Promise.all(ids.map(async ({ id, setter }) => {
        try {
          const result = await base44.entities.User.filter({ id });
          if (result.length > 0) {
            setter(result[0].full_name || result[0].email);
          }
        } catch (err) {
          console.error("Erro ao buscar usuário:", err);
        }
      }));
    };
    buscarNomes();
  }, [tarefa.created_by_id, tarefa.assigned_to_id, tarefa.requester_id]);

  // Criador/admin = acesso total ao formulário de edição
  const ehCriador = !user || user.id === tarefa.created_by_id || user.role === 'admin';
  // Executor = consultor responsável ou atribuído, mas NÃO é o criador
  const ehExecutor = !ehCriador && (
    user?.id === tarefa.consultor_id || user?.id === tarefa.assigned_to_id
  );
  // Botão "Editar" só para criador/admin
  const podeEditar = ehCriador;

  // Mutation genérica de update de tarefa
  const updateMutation = useMutation({
    mutationFn: async (dados) => base44.entities.TarefaBacklog.update(tarefa.id, dados),
    onSuccess: () => {
      queryClient.invalidateQueries(['tarefa-historico', tarefa.id]);
    }
  });

  // Mutation para concluir tarefa
  const concludirMutation = useMutation({
    mutationFn: async () => {
      return await base44.entities.TarefaBacklog.update(tarefa.id, {
        status: 'concluida',
        data_conclusao: new Date().toISOString(),
        notas: notasExecucao || tarefa.notas,
        anexos: anexosExecucao.length > 0 ? anexosExecucao : tarefa.anexos,
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

  // Iniciar tarefa automaticamente (status aberta → em_execucao)
  const iniciarMutation = useMutation({
    mutationFn: async () => base44.entities.TarefaBacklog.update(tarefa.id, { status: 'em_execucao' }),
    onSuccess: () => {
      toast.success('Tarefa iniciada!');
      if (onConcluir) onConcluir(); // recarrega a lista pai
    }
  });

  // Bloquear tarefa
  const bloquearMutation = useMutation({
    mutationFn: async () => base44.entities.TarefaBacklog.update(tarefa.id, {
      status: 'bloqueada',
      motivo_bloqueio: motivoBloqueio
    }),
    onSuccess: () => {
      toast.warning('Tarefa marcada como bloqueada.');
      setShowBloquearForm(false);
      if (onConcluir) onConcluir();
    }
  });

  // Salvar notas/anexos sem mudar status
  const salvarExecucaoMutation = useMutation({
    mutationFn: async () => base44.entities.TarefaBacklog.update(tarefa.id, {
      notas: notasExecucao,
      anexos: anexosExecucao,
    }),
    onSuccess: () => toast.success('Progresso salvo!'),
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
      {/* Cabeçalho */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="sm" onClick={onVoltar} aria-label="Voltar para a lista">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold leading-tight text-gray-950 sm:text-2xl">{tarefa.titulo}</h2>
            <p className="mt-1 truncate text-xs text-gray-400">ID: {tarefa.id}</p>
          </div>
        </div>

        <div className="my-4 border-t border-gray-100" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <div><p className="text-xs text-gray-500">Status</p><Badge className={`mt-1 ${statusCfg.className}`}>{statusCfg.label}</Badge></div>
          <div><p className="text-xs text-gray-500">Prioridade</p><Badge className={`mt-1 ${prioridadeCfg.className}`}>{prioridadeCfg.label}</Badge></div>
          <div><p className="text-xs text-gray-500">Prazo</p><p className="mt-1 text-sm font-medium">{tarefa.prazo ? format(new Date(tarefa.prazo), "dd/MM/yyyy", { locale: ptBR }) : "—"}</p></div>
          <div><p className="text-xs text-gray-500">Estimativa</p><p className="mt-1 text-sm font-medium">{tarefa.tempo_estimado_horas || 0}h</p></div>
          <div><p className="text-xs text-gray-500">Criado em</p><p className="mt-1 text-sm font-medium">{tarefa.data_criacao ? format(new Date(tarefa.data_criacao), "dd/MM/yyyy", { locale: ptBR }) : tarefa.created_date ? format(new Date(tarefa.created_date), "dd/MM/yyyy", { locale: ptBR }) : "—"}</p></div>
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-4">
          {onEditar && podeEditar && <Button variant="outline" size="sm" onClick={() => onEditar(tarefa)}>Editar</Button>}
          {tarefa.status !== 'concluida' && (
            <Button size="sm" onClick={() => concludirMutation.mutate()} disabled={concludirMutation.isPending} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="mr-1 h-4 w-4" />
              {concludirMutation.isPending ? 'Concluindo...' : 'Concluir Tarefa'}
            </Button>
          )}
        </div>
      </section>

      {/* Banner de rastreabilidade — exibido quando a tarefa tem origem em uma ATA */}
      {tarefa.origin_type === 'reuniao' && tarefa.origin_id && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 flex items-start gap-3">
          <FileText className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-blue-900">
              📋 Criado na ATA de Reunião{tarefa.workshop_nome ? ` com ${tarefa.workshop_nome}` : ""}
            </p>
            <p className="text-xs text-blue-700 mt-0.5">
              {tarefa.origin_date
                ? format(new Date(tarefa.origin_date), "dd/MM/yyyy 'às' HH'h'mm", { locale: ptBR })
                : "Data não disponível"}
              {tarefa.assignee_name ? ` · ${tarefa.assignee_name}` : ""}
              {tarefa.origin_title ? ` · ${tarefa.origin_title}` : ""}
            </p>
          </div>
          <a
            href={`/RegistrarAtendimento?atendimento_id=${tarefa.origin_id}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 whitespace-nowrap flex-shrink-0 mt-0.5"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Ver ATA original
          </a>
        </div>
      )}

      {/* Banner de rastreabilidade — tarefa originada de pedido interno aprovado */}
      <OrigemPedidoBanner tarefa={tarefa} />

      {/* ── Grid principal: Dados + Responsáveis ── */}
      <div className="grid items-start gap-6 lg:grid-cols-[3fr_2fr]">
        {/* Dados Gerais */}
        <Card className="h-full rounded-xl">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" /> Dados Gerais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-2">
            {tarefa.descricao && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Descrição</p>
                <p className="text-sm text-gray-800 leading-relaxed">{tarefa.descricao}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t">
              <div>
                <p className="text-xs text-gray-500 mb-1">Cliente</p>
                <p className="text-sm font-medium">{tarefa.workshop_nome || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Origem</p>
                <Badge variant="outline" className="text-xs capitalize">{tarefa.origin_type}</Badge>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Impacto</p>
                <p className="text-sm capitalize">{tarefa.impacto || "—"}</p>
              </div>
              {tarefa.tempo_real_horas && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Tempo Real</p>
                  <p className="text-sm font-medium">{tarefa.tempo_real_horas}h</p>
                </div>
              )}
            </div>

          </CardContent>
        </Card>

        {/* Responsáveis */}
        <Card className="h-full rounded-xl">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4" /> Responsáveis
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">Consultor</p>
                <p className="text-sm font-medium">{tarefa.assignee_name || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Atribuído para</p>
                <p className="text-sm font-medium">{atribuidoParaNome || "—"}</p>
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
                <p className="text-sm">{solicitanteNome || "—"}</p>
              </div>
              {tarefa.data_atribuicao && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Data Atribuição</p>
                  <p className="text-sm">{format(new Date(tarefa.data_atribuicao), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
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

      {tarefa.motivo_bloqueio && (
        <section className="rounded-xl border border-red-200 bg-red-50 p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-red-700"><AlertCircle className="h-4 w-4" /> Motivo do bloqueio</h3>
          <p className="mt-2 text-sm text-red-800">{tarefa.motivo_bloqueio}</p>
        </section>
      )}

      {/* ── Histórico em timeline ── */}
      <Card className="rounded-xl">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              📋 Histórico de Alterações
            </CardTitle>
            {historico.length > 0 && (
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">{historico.length} eventos</span>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          {loadingHistorico ? (
            <p className="text-sm text-gray-400 text-center py-6">Carregando histórico...</p>
          ) : historico.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Nenhum evento registrado ainda.</p>
          ) : (
            <div className="pt-2">
              {historico.map((evento) => (
                <TimelineItem key={evento.id} evento={evento} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {tarefa.notas && (
        <Card className="rounded-xl">
          <CardHeader className="p-4 pb-2"><CardTitle className="text-base">Comentários</CardTitle></CardHeader>
          <CardContent className="p-4 pt-2"><p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{tarefa.notas}</p></CardContent>
        </Card>
      )}

      <TarefaBacklogAnexosVisualizador tarefa={tarefa} />

      {/* ── Painel de Execução — visível para o executor (consultor/atribuído não-criador) ── */}
      {ehExecutor && tarefa.status !== 'concluida' && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-blue-900 flex items-center gap-2">
              <Play className="w-4 h-4" /> Painel de Execução
            </CardTitle>
            <p className="text-xs text-blue-700">Registre seu progresso, adicione evidências e atualize o status.</p>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Ações de status */}
            <div className="flex flex-wrap gap-2">
              {tarefa.status === 'aberta' && (
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                  onClick={() => iniciarMutation.mutate()}
                  disabled={iniciarMutation.isPending}
                >
                  <Play className="w-4 h-4" />
                  {iniciarMutation.isPending ? 'Iniciando...' : '▶ Iniciar Tarefa'}
                </Button>
              )}
              {tarefa.status === 'em_execucao' && (
                <Badge className="bg-blue-100 text-blue-800 text-xs px-3 py-1">Em execução</Badge>
              )}
              <Button
                size="sm"
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50 gap-2"
                onClick={() => setShowBloquearForm(!showBloquearForm)}
              >
                <Lock className="w-4 h-4" /> Bloquear
              </Button>
            </div>

            {/* Form de bloqueio */}
            {showBloquearForm && (
              <div className="space-y-2">
                <Label className="text-sm text-red-700">Motivo do bloqueio *</Label>
                <Textarea
                  value={motivoBloqueio}
                  onChange={(e) => setMotivoBloqueio(e.target.value)}
                  placeholder="Descreva o que está impedindo a execução..."
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-red-600 hover:bg-red-700 text-white"
                    onClick={() => bloquearMutation.mutate()}
                    disabled={!motivoBloqueio || bloquearMutation.isPending}
                  >
                    Confirmar Bloqueio
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowBloquearForm(false)}>Cancelar</Button>
                </div>
              </div>
            )}

            {/* Notas de execução / evidência textual */}
            <div>
              <Label className="text-sm text-blue-900">Notas / Evidência do que foi feito</Label>
              <Textarea
                value={notasExecucao}
                onChange={(e) => setNotasExecucao(e.target.value)}
                placeholder="Descreva o que foi realizado, resultados, observações..."
                rows={3}
                className="mt-1"
              />
            </div>

            {/* Upload de evidências (imagens, arquivos, links) */}
            <div>
              <Label className="text-sm text-blue-900 flex items-center gap-1">
                <Paperclip className="w-3.5 h-3.5" /> Anexos / Evidências
              </Label>
              <div className="mt-1">
                <TarefaBacklogMediaUpload
                  anexos={anexosExecucao}
                  onAnexosChange={setAnexosExecucao}
                />
              </div>
            </div>

            {/* Botões finais */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-blue-200">
              <Button
                size="sm"
                variant="outline"
                className="border-blue-300 text-blue-700"
                onClick={() => salvarExecucaoMutation.mutate()}
                disabled={salvarExecucaoMutation.isPending}
              >
                {salvarExecucaoMutation.isPending ? 'Salvando...' : 'Salvar Progresso'}
              </Button>
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white gap-2"
                onClick={() => concludirMutation.mutate()}
                disabled={concludirMutation.isPending}
              >
                <CheckCircle className="w-4 h-4" />
                {concludirMutation.isPending ? 'Concluindo...' : '✓ Concluir Tarefa'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}