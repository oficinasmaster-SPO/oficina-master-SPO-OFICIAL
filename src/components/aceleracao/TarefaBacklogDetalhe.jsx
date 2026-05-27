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
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
      {/* Dot */}
      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${config.cor}`} />

      {/* Label + autor */}
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-gray-800">{config.label}</span>
        {evento.usuario_nome && (
          <span className="text-xs text-gray-500 ml-1">por {evento.usuario_nome.split(' ')[0]}</span>
        )}
        {(evento.valor_anterior || evento.valor_novo) && (
          <div className="flex items-center gap-1 mt-0.5">
            {evento.valor_anterior && (
              <span className="text-xs line-through text-red-400 truncate max-w-[80px]">{evento.valor_anterior}</span>
            )}
            {evento.valor_anterior && evento.valor_novo && <span className="text-gray-400 text-xs">→</span>}
            {evento.valor_novo && (
              <span className="text-xs text-green-600 font-medium truncate max-w-[80px]">{evento.valor_novo}</span>
            )}
          </div>
        )}
      </div>

      {/* Data */}
      {dataHora && (
        <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0 bg-gray-100 px-2 py-0.5 rounded-full">
          {format(dataHora, "dd/MM HH:mm", { locale: ptBR })}
        </span>
      )}
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
        { id: tarefa.criado_por_id, setter: setCriadoPorNome },
        { id: tarefa.atribuido_para_id, setter: setAtribuidoParaNome },
        { id: tarefa.solicitante_id, setter: setSolicitanteNome },
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
  }, [tarefa.criado_por_id, tarefa.atribuido_para_id, tarefa.solicitante_id]);

  // Criador/admin = acesso total ao formulário de edição
  const ehCriador = !user || user.id === tarefa.criado_por_id || user.role === 'admin';
  // Executor = consultor responsável ou atribuído, mas NÃO é o criador
  const ehExecutor = !ehCriador && (
    user?.id === tarefa.consultor_id || user?.id === tarefa.atribuido_para_id
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
          {onEditar && podeEditar && (
            <Button variant="outline" size="sm" onClick={() => onEditar(tarefa)}>
              Editar
            </Button>
          )}
        </div>
      </div>

      {/* Banner de rastreabilidade — exibido quando a tarefa tem origem em uma ATA */}
      {tarefa.origem === 'reuniao' && tarefa.origem_id && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 flex items-start gap-3">
          <FileText className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-blue-900">
              📋 Criado na ATA de Reunião{tarefa.cliente_nome ? ` com ${tarefa.cliente_nome}` : ""}
            </p>
            <p className="text-xs text-blue-700 mt-0.5">
              {tarefa.origem_data
                ? format(new Date(tarefa.origem_data), "dd/MM/yyyy 'às' HH'h'mm", { locale: ptBR })
                : "Data não disponível"}
              {tarefa.consultor_nome ? ` · ${tarefa.consultor_nome}` : ""}
              {tarefa.origem_titulo ? ` · ${tarefa.origem_titulo}` : ""}
            </p>
          </div>
          <a
            href={`/RegistrarAtendimento?atendimento_id=${tarefa.origem_id}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 whitespace-nowrap flex-shrink-0 mt-0.5"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Ver ATA original
          </a>
        </div>
      )}

      {/* ── Barra de Status horizontal ── */}
      <Card className="border-0 bg-gray-50">
        <CardContent className="py-3 px-5">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs text-gray-500">Status:</span>
              <Badge className={statusCfg.className}>{statusCfg.label}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Prioridade:</span>
              <Badge className={prioridadeCfg.className}>{prioridadeCfg.label}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs text-gray-500">Prazo:</span>
              <span className="text-sm font-medium">
                {tarefa.prazo ? format(new Date(tarefa.prazo), "dd/MM/yyyy", { locale: ptBR }) : "—"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs text-gray-500">Estimado:</span>
              <span className="text-sm font-medium">{tarefa.tempo_estimado_horas}h</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Criado em:</span>
              <span className="text-xs text-gray-600">
                {tarefa.data_criacao
                  ? format(new Date(tarefa.data_criacao), "dd/MM/yyyy HH:mm", { locale: ptBR })
                  : tarefa.created_date
                  ? format(new Date(tarefa.created_date), "dd/MM/yyyy HH:mm", { locale: ptBR })
                  : "—"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Grid principal: Dados + Responsáveis ── */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Dados Gerais */}
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
                <p className="text-sm text-gray-800 leading-relaxed">{tarefa.descricao}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t">
              <div>
                <p className="text-xs text-gray-500 mb-1">Cliente</p>
                <p className="text-sm font-medium">{tarefa.cliente_nome || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Origem</p>
                <Badge variant="outline" className="text-xs capitalize">{tarefa.origem}</Badge>
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
            {tarefa.motivo_bloqueio && (
              <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2">
                <p className="text-xs text-red-500 mb-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Motivo do Bloqueio
                </p>
                <p className="text-sm text-red-700">{tarefa.motivo_bloqueio}</p>
              </div>
            )}
            {tarefa.notas && (
              <div className="rounded-lg bg-yellow-50 border border-yellow-100 px-3 py-2">
                <p className="text-xs text-gray-500 mb-1">Notas</p>
                <p className="text-sm text-gray-700">{tarefa.notas}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Responsáveis */}
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

      {/* ── Histórico em largura total com itens horizontais ── */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              📋 Histórico de Alterações
            </CardTitle>
            {historico.length > 0 && (
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">{historico.length} eventos</span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loadingHistorico ? (
            <p className="text-sm text-gray-400 text-center py-6">Carregando histórico...</p>
          ) : historico.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Nenhum evento registrado ainda.</p>
          ) : (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {historico.map((evento) => (
                <TimelineItem key={evento.id} evento={evento} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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