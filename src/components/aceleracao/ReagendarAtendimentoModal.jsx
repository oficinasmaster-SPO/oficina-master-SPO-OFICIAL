import React, { useMemo, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Combobox from "@/components/ui/combobox";
import { AlertCircle, AlertTriangle, Calendar, Clock, Loader2, Video, CheckCircle, Copy, ChevronRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useGoogleMeet } from "@/components/hooks/useGoogleMeet";
import { STATUS_POS_VENDA, MOTIVOS_CLIENTE, MOTIVOS_EMPRESA, RESPONSABILIDADE_OPTIONS } from "./ReagendamentoFilterOptions";

const TODOS_MOTIVOS = {
  ...MOTIVOS_CLIENTE,
  ...MOTIVOS_EMPRESA,
};

// ── Utilitário de detecção de sobreposição ──────────────────────────────────
// Retorna true se o slot (novaData, novoHorario, duracao) se sobrepõe com "a"
function seOverpoe(a, novaData, novoHorario, duracaoMin) {
  if (!a.data_agendada || !novaData || !novoHorario) return false;
  const novoInicio = new Date(`${novaData}T${novoHorario}:00`).getTime();
  const novoFim   = novoInicio + duracaoMin * 60000;
  const aInicio   = new Date(a.data_agendada).getTime();
  const aFim      = aInicio + (a.duracao_minutos || 60) * 60000;
  // Sobreposição: um começa antes do outro terminar
  return novoInicio < aFim && novoFim > aInicio;
}

// Formata HH:MM a partir de um Date ou ISO string
function fmtHora(dateOrStr) {
  try {
    const d = typeof dateOrStr === 'string' ? new Date(dateOrStr) : dateOrStr;
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

function fmtDataHora(isoStr) {
  try {
    return new Date(isoStr).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch { return isoStr; }
}

// ───────────────────────────────────────────────────────────────────────────

export default function ReagendarAtendimentoModal({
  atendimento,
  workshop,
  onClose,
  onSaved,
  todosAtendimentos = [], // lista completa — usada para detecção de conflito
}) {
  const [loading, setLoading] = useState(false);

  // ── Campos principais ──
  const [novaData,    setNovaData]    = useState(atendimento?._data_sugerida_cliente || "");
  const [novoHorario, setNovoHorario] = useState(atendimento?._hora_sugerida_cliente || "");
  const [statusPosvenda,    setStatusPosvenda]    = useState("");
  const [responsabilidade,  setResponsabilidade]  = useState("");
  const [motivoSelecionado, setMotivoSelecionado] = useState("");
  const [descricaoManual,   setDescricaoManual]   = useState(atendimento?._mensagem_cliente || "");

  // ── Google Meet ──
  const [novoMeetLink,     setNovoMeetLink]     = useState("");
  const [novoEventId,      setNovoEventId]      = useState("");
  const [novoCalendarLink, setNovoCalendarLink] = useState("");
  const [descricaoReuniao, setDescricaoReuniao] = useState("");
  const { createMeeting, isCreating } = useGoogleMeet();

  // ── Sobreposição ──
  const [conflitos,          setConflitos]          = useState([]);   // array de atendimentos conflitantes
  const [ignorarConflito,    setIgnorarConflito]    = useState(false); // usuário escolheu "continuar mesmo assim"
  const [sugestoesHorario,   setSugestoesHorario]   = useState([]);   // slots livres sugeridos
  const [loadingSugestoes,   setLoadingSugestoes]   = useState(false);

  const veioDeSugestaoCliente = !!atendimento?._data_sugerida_cliente;

  const motivosFiltrados = responsabilidade === 'cliente'      ? MOTIVOS_CLIENTE :
                           responsabilidade === 'empresa'       ? MOTIVOS_EMPRESA :
                           responsabilidade === 'compartilhada' ? TODOS_MOTIVOS : {};

  const statusPosVendaOptions   = useMemo(() => Object.entries(STATUS_POS_VENDA).map(([k, l]) => ({ value: k, label: l })), []);
  const responsabilidadeOptions = useMemo(() => Object.entries(RESPONSABILIDADE_OPTIONS).map(([k, l]) => ({ value: k, label: l })), []);
  const motivoOptions           = useMemo(() => Object.entries(motivosFiltrados).map(([k, l]) => ({ value: k, label: l })), [motivosFiltrados]);

  const duracao = atendimento?.duracao_minutos || 60;

  // ── Detectar conflitos em tempo real ao mudar data/hora ──────────────────
  useEffect(() => {
    setIgnorarConflito(false);
    setSugestoesHorario([]);

    if (!novaData || !novoHorario || !atendimento?.consultor_id) {
      setConflitos([]);
      return;
    }

    const candidatos = todosAtendimentos.filter(a =>
      a.id !== atendimento.id &&
      a.consultor_id === atendimento.consultor_id &&
      !['cancelado', 'concluido', 'faltou'].includes(a.status) &&
      seOverpoe(a, novaData, novoHorario, duracao)
    );
    setConflitos(candidatos);
  }, [novaData, novoHorario, todosAtendimentos, atendimento?.id, atendimento?.consultor_id, duracao]);

  // ── Sugestão de horários livres ──────────────────────────────────────────
  const handleSugerirHorario = async () => {
    if (!novaData || !atendimento?.consultor_id) return;
    setLoadingSugestoes(true);
    try {
      // Tenta chamar a function backend; se não existir, calcula localmente.
      let slots = [];
      try {
        const res = await base44.functions.invoke('getHorariosDisponiveis', {
          consultor_id: atendimento.consultor_id,
          data: novaData,
          duracao_minutos: duracao,
        });
        slots = res?.data?.slots || res?.slots || [];
      } catch {
        // Fallback local: gera slots de hora em hora das 8h às 18h
        // e filtra os que não conflitam com atendimentos do consultor naquele dia.
        const atendimentosDia = todosAtendimentos.filter(a =>
          a.id !== atendimento.id &&
          a.consultor_id === atendimento.consultor_id &&
          !['cancelado', 'concluido', 'faltou'].includes(a.status) &&
          (a.data_agendada || '').slice(0, 10) === novaData
        );

        for (let h = 8; h <= 18; h++) {
          const horaCandidato = `${String(h).padStart(2, '0')}:00`;
          const conflito = atendimentosDia.some(a => seOverpoe(a, novaData, horaCandidato, duracao));
          if (!conflito) slots.push(horaCandidato);
          if (slots.length >= 3) break;
        }
      }
      setSugestoesHorario(slots.slice(0, 3));
    } catch (e) {
      toast.error("Não foi possível buscar sugestões de horário");
    } finally {
      setLoadingSugestoes(false);
    }
  };

  // ── Google Meet ──────────────────────────────────────────────────────────
  const handleCriarMeet = async () => {
    if (!novaData || !novoHorario) { toast.error("Preencha data e horário antes de criar a reunião"); return; }

    const startDateTime = new Date(`${novaData}T${novoHorario}:00`);
    const endDateTime   = new Date(startDateTime.getTime() + duracao * 60000);
    const dataFormatada = startDateTime.toLocaleDateString('pt-BR');
    const horaFormatada = startDateTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const dataAnterior  = new Date(atendimento.data_agendada).toLocaleString('pt-BR');
    const statusLabel   = STATUS_POS_VENDA[statusPosvenda] || statusPosvenda || 'Reagendamento';
    const respLabel     = RESPONSABILIDADE_OPTIONS[responsabilidade] || responsabilidade || '';
    const motivoLabel   = motivosFiltrados[motivoSelecionado] || motivoSelecionado || '';

    const descricaoTexto = [
      `📋 REAGENDAMENTO DE ATENDIMENTO`,
      ``,
      `🏢 Cliente: ${workshop?.name || 'N/A'}`,
      `📅 Data anterior: ${dataAnterior}`,
      `📅 Nova data: ${dataFormatada} às ${horaFormatada}`,
      ``,
      `📌 Status: ${statusLabel}`,
      respLabel    ? `👤 Responsabilidade: ${respLabel}` : '',
      motivoLabel  ? `💬 Motivo: ${motivoLabel}` : '',
      descricaoManual ? `\n📝 Observações: ${descricaoManual}` : '',
      ``, `---`,
      `Reunião criada automaticamente pelo sistema Oficinas Master.`,
    ].filter(Boolean).join('\n');

    const meetData = await createMeeting({
      summary: `🔄 Reagendamento - ${workshop?.name || 'Cliente'} - Oficinas Master`,
      description: descricaoTexto,
      startDateTime: startDateTime.toISOString(),
      endDateTime: endDateTime.toISOString(),
      attendees: [],
    });

    if (meetData) {
      setNovoMeetLink(meetData.meetLink);
      setNovoEventId(meetData.eventId);
      setNovoCalendarLink(meetData.htmlLink);
      setDescricaoReuniao(descricaoTexto);
      toast.success("Reunião criada com sucesso!");
    }
  };

  // ── Salvar ───────────────────────────────────────────────────────────────
  const handleReagendar = async () => {
    if (!novaData || !novoHorario) { toast.error("Preencha nova data e horário"); return; }
    if (!statusPosvenda)           { toast.error("Selecione o status pós-venda"); return; }
    if (!responsabilidade)         { toast.error("Selecione a responsabilidade"); return; }

    setLoading(true);
    try {
      const user         = await base44.auth.me();
      const novaDataHora = `${novaData}T${novoHorario}:00`;
      const startDateTime = new Date(novaDataHora);
      const endDateTime   = new Date(startDateTime.getTime() + duracao * 60000);

      const updateData = {
        data_agendada: novaDataHora,
        status: 'reagendado',
        motivo_reagendamento: descricaoManual,
        status_posta_venda: statusPosvenda,
        responsabilidade,
      };

      // Motivo específico por responsabilidade
      if (responsabilidade === 'cliente') {
        updateData.motivo_cancelamento_cliente = motivoSelecionado;
      } else if (responsabilidade === 'empresa') {
        updateData.motivo_cancelamento_empresa = motivoSelecionado;
      } else if (responsabilidade === 'compartilhada') {
        updateData.motivo_cancelamento_cliente = motivoSelecionado;
        updateData.motivo_cancelamento_empresa = motivoSelecionado;
      }

      // Persiste info de sobreposição quando usuário ignorou conflito
      if (conflitos.length > 0 && ignorarConflito) {
        const c = conflitos[0]; // registra o primeiro conflito
        // QA-FIX: conflito_cliente deve ser o nome da oficina/cliente do atendimento
        // conflitante (workshop_nome), não o consultor_nome que é o consultor daquele atendimento.
        // todosAtendimentos não carrega workshopMap aqui, então usamos workshop_nome se existir
        // ou fallback para o workshop_id legível.
        updateData.sobreposicao_info = {
          conflito_atendimento_id:  c.id,
          conflito_cliente:         c.workshop_nome || c.workshop_id || 'outro cliente',
          conflito_horario_inicio:  c.data_agendada,
          conflito_horario_fim:     new Date(
            new Date(c.data_agendada).getTime() + (c.duracao_minutos || 60) * 60000
          ).toISOString(),
        };
      } else {
        // Reagendamento limpo — apaga sobreposição anterior se existia
        updateData.sobreposicao_info = null;
      }

      // Google Calendar — atualizar evento existente
      if (atendimento.google_event_id) {
        try {
          const descricaoTexto = [
            `📋 REAGENDAMENTO DE ATENDIMENTO`,
            `🏢 Cliente: ${workshop?.name || 'N/A'}`,
            `📅 Nova data: ${startDateTime.toLocaleString('pt-BR')}`,
          ].join('\n');

          const result = await base44.functions.invoke('updateGoogleMeetEvent', {
            eventId: atendimento.google_event_id,
            summary: `🔄 Reagendamento - ${workshop?.name || 'Cliente'} - Oficinas Master`,
            description: descricaoTexto,
            startDateTime: startDateTime.toISOString(),
            endDateTime: endDateTime.toISOString(),
          });

          if (result?.data?.success) {
            updateData.google_meet_link     = result.data.meetLink     || atendimento.google_meet_link;
            updateData.google_calendar_link = result.data.htmlLink     || atendimento.google_calendar_link;
            toast.success("Evento atualizado no Google Calendar!");
          }
        } catch (e) {
          console.error("Erro Google Calendar:", e);
          toast.warning("Reagendamento salvo, mas Google Calendar não foi atualizado.");
        }
      }

      // Novo Meet criado manualmente
      if (novoMeetLink && !atendimento.google_event_id) {
        updateData.google_meet_link     = novoMeetLink;
        updateData.google_event_id      = novoEventId;
        updateData.google_calendar_link = novoCalendarLink;
      }

      await base44.entities.ConsultoriaAtendimento.update(atendimento.id, updateData);

      // Ata de reagendamento
      const ataCount = await base44.entities.MeetingMinutes.list();
      const code = `AT.${String(ataCount.length + 1).padStart(4, '0')}`;
      await base44.entities.MeetingMinutes.create({
        code,
        workshop_id:           workshop.id,
        atendimento_id:        atendimento.id,
        meeting_date:          new Date().toISOString().split('T')[0],
        meeting_time:          new Date().toTimeString().slice(0, 5),
        tipo_aceleracao:       'reagendamento',
        consultor_name:        user.full_name,
        consultor_id:          user.id,
        participantes:         [],
        responsavel:           { name: workshop.name, role: "Cliente" },
        pautas:                `Reagendamento de atendimento - ${statusPosvenda}`,
        objetivos_atendimento: `Atendimento reagendado de ${fmtDataHora(atendimento.data_agendada)} para ${fmtDataHora(novaDataHora)}`,
        objetivos_consultor:   descricaoManual || "Reagendamento conforme necessidade",
        proximos_passos:       `Realizar atendimento em ${fmtDataHora(novaDataHora)} — Responsável: ${user.full_name}`,
        visao_geral_projeto:   `Atendimento original em ${fmtDataHora(atendimento.data_agendada)} reagendado. Responsabilidade: ${responsabilidade}.`,
        status: 'finalizada',
      });

      toast.success("Atendimento reagendado com sucesso!");
      if (onSaved) onSaved();
      onClose();
    } catch (error) {
      console.error("Erro ao reagendar:", error);
      toast.error("Erro: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Helpers de UI ─────────────────────────────────────────────────────────
  const temConflito        = conflitos.length > 0;
  const podeSubmeter       = novaData && novoHorario && statusPosvenda && responsabilidade &&
                             (!temConflito || ignorarConflito);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Reagendar Atendimento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">

          {/* Banner sugestão do cliente */}
          {veioDeSugestaoCliente && (
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 flex gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900">
                <p className="font-semibold">Reagendamento solicitado pelo cliente</p>
                <p>Data/hora e motivo já foram pré-preenchidos com a sugestão do cliente. Ajuste se necessário.</p>
              </div>
            </div>
          )}

          {/* Info Cliente */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-900"><strong>Cliente:</strong> {workshop?.name}</p>
            <p className="text-sm text-blue-900"><strong>Data Atual:</strong> {fmtDataHora(atendimento.data_agendada)}</p>
          </div>

          {/* Nova Data e Hora */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nova Data *</Label>
              <Input type="date" value={novaData} onChange={(e) => setNovaData(e.target.value)} />
            </div>
            <div>
              <Label>Novo Horário *</Label>
              <Input type="time" value={novoHorario} onChange={(e) => setNovoHorario(e.target.value)} />
            </div>
          </div>

          {/* ── Banner de sobreposição ─────────────────────────────────── */}
          {temConflito && !ignorarConflito && (
            <div className="bg-orange-50 border border-orange-300 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-orange-900">
                    Sobreposição de horário detectada
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {conflitos.map(c => (
                      <li key={c.id} className="text-xs text-orange-800">
                        • <strong>{c.consultor_nome || 'Atendimento'}</strong> —{' '}
                        {fmtHora(c.data_agendada)} às {fmtHora(
                          new Date(new Date(c.data_agendada).getTime() + (c.duracao_minutos || 60) * 60000)
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {/* Sugerir horário livre */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-orange-300 text-orange-700 hover:bg-orange-100 text-xs"
                  onClick={handleSugerirHorario}
                  disabled={loadingSugestoes}
                >
                  {loadingSugestoes
                    ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Buscando...</>
                    : <><Clock className="w-3 h-3 mr-1" />Sugerir outro horário</>
                  }
                </Button>

                {/* Continuar mesmo assim */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-orange-600 hover:text-orange-800 hover:bg-orange-100 text-xs"
                  onClick={() => setIgnorarConflito(true)}
                >
                  Continuar mesmo assim
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </div>

              {/* Slots sugeridos */}
              {sugestoesHorario.length > 0 && (
                <div className="pt-1">
                  <p className="text-xs text-orange-700 font-medium mb-1.5">Próximos horários livres:</p>
                  <div className="flex gap-2 flex-wrap">
                    {sugestoesHorario.map(slot => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => {
                          setNovoHorario(slot);
                          setSugestoesHorario([]);
                        }}
                        className="px-3 py-1.5 bg-white border border-orange-300 rounded-md text-xs font-medium text-orange-800 hover:bg-orange-50 transition-colors"
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Aviso quando conflito foi ignorado */}
          {temConflito && ignorarConflito && (
            <div className="bg-orange-50 border border-orange-200 rounded-md px-3 py-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />
              <p className="text-xs text-orange-700">
                Este reagendamento terá sobreposição com {conflitos.length === 1 ? 'outro atendimento' : `${conflitos.length} atendimentos`}.
                A informação ficará registrada no histórico.
              </p>
              <button
                type="button"
                onClick={() => setIgnorarConflito(false)}
                className="ml-auto text-xs text-orange-600 hover:underline whitespace-nowrap"
              >
                Desfazer
              </button>
            </div>
          )}

          {/* Google Meet */}
          {novaData && novoHorario && (
            <div className="space-y-3">
              {!novoMeetLink ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
                  disabled={isCreating}
                  onClick={handleCriarMeet}
                >
                  {isCreating
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Criando reunião...</>
                    : <><Video className="w-4 h-4 mr-2" />Criar Nova Reunião Google Meet</>
                  }
                </Button>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Reunião criada com sucesso!</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input value={novoMeetLink} readOnly className="text-xs bg-white" />
                    <Button
                      type="button" variant="ghost" size="icon" className="shrink-0"
                      onClick={() => { navigator.clipboard.writeText(novoMeetLink); toast.success("Link copiado!"); }}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  {descricaoReuniao && (
                    <div className="mt-3 bg-white border border-green-100 rounded-md p-3">
                      <p className="text-xs font-medium text-green-700 mb-1">📋 Descrição enviada ao evento:</p>
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{descricaoReuniao}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Status Pós-Venda */}
          <div>
            <Label>Status Pós-Venda *</Label>
            <Combobox
              options={statusPosVendaOptions}
              value={statusPosvenda}
              onChange={setStatusPosvenda}
              placeholder="Selecione o status"
              searchPlaceholder="Buscar status..."
            />
          </div>

          {/* Responsabilidade */}
          <div>
            <Label>Responsabilidade *</Label>
            <Combobox
              options={responsabilidadeOptions}
              value={responsabilidade}
              onChange={(val) => { setResponsabilidade(val); setMotivoSelecionado(""); }}
              placeholder="Selecione a responsabilidade"
              searchPlaceholder="Buscar responsabilidade..."
            />
          </div>

          {/* Alerta para responsabilidade do cliente */}
          {responsabilidade === 'cliente' && (
            <div className="bg-blue-50 border border-blue-300 rounded-lg p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">📧 E-mail automático será enviado</p>
                <p>O cliente receberá notificação automática informando que este atendimento será contabilizado como realizado com sucesso, conforme o contrato comercial.</p>
              </div>
            </div>
          )}

          {/* Motivo específico */}
          {responsabilidade && (
            <div>
              <Label>
                Motivo {responsabilidade === 'cliente' ? 'do Cliente' : responsabilidade === 'empresa' ? 'da Empresa' : 'do Reagendamento'} *
              </Label>
              <Combobox
                options={motivoOptions}
                value={motivoSelecionado}
                onChange={setMotivoSelecionado}
                placeholder="Selecione o motivo"
                searchPlaceholder="Buscar motivo..."
              />
            </div>
          )}

          {/* Descrição livre */}
          <div>
            <Label>Descrição Detalhada (opcional)</Label>
            <Textarea
              value={descricaoManual}
              onChange={(e) => setDescricaoManual(e.target.value)}
              placeholder="Descreva os detalhes adicionais do reagendamento..."
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button
            onClick={handleReagendar}
            disabled={loading || !podeSubmeter}
            className="bg-blue-600"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Reagendando...</>
              : "Reagendar"
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
