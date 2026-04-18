import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, MapPin, Users, Lock, CheckCircle2, Ticket, Plus, Trash2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function EventosTab({ workshop, activeWorkshopId, user }) {
  const queryClient = useQueryClient();
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const anoAtual = new Date().getFullYear();

  // Carregar eventos do calendário anual (todos ativos — sem filtro de ano para não perder nada)
  const { data: eventosCalendario = [], isLoading: loadingEventos } = useQuery({
    queryKey: ["event-calendar-todos"],
    queryFn: () =>
      base44.entities.EventCalendar.filter({ is_active: true }, "event_date"),
    staleTime: 0,
    gcTime: 0,
  });

  // Plano atual do workshop — pode vir em data.planoAtual ou direto no objeto
  const planoAtual = workshop?.planoAtual || workshop?.data?.planoAtual;

  // Carregar regras do plano da oficina para identificar eventos inclusos
  const { data: planRules = [], isLoading: loadingRules, isFetched: rulesFetched } = useQuery({
    queryKey: ["plan-rules-workshop", activeWorkshopId, planoAtual],
    queryFn: async () => {
      if (!planoAtual) return [];
      const rules = await base44.entities.PlanAttendanceRule.filter({
        plan_id: planoAtual,
        is_active: true,
      });
      return rules;
    },
    enabled: !!activeWorkshopId && !!planoAtual,
    staleTime: 0,
    gcTime: 0,
  });

  // Inscrições já feitas pela oficina
  const { data: inscricoes = [] } = useQuery({
    queryKey: ["evento-inscricoes", activeWorkshopId],
    queryFn: () =>
      base44.entities.EventoInscricao.filter({ workshop_id: activeWorkshopId }, "-created_date"),
    enabled: !!activeWorkshopId,
  });

  // Colaboradores da oficina para autopreenchimento
  const { data: colaboradores = [] } = useQuery({
    queryKey: ["colaboradores-oficina", activeWorkshopId],
    queryFn: () =>
      base44.entities.Employee.filter({ workshop_id: activeWorkshopId, status: "ativo" }),
    enabled: !!activeWorkshopId,
  });

  // Tipos de atendimento vinculados a eventos no plano
  // Match por ID OU por nome (normalizado), pois eventos legados usam slugs como attendance_type_id
  const normalizar = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

  const isEventoIncluso = (evento) => {
    return planRules.some((r) => {
      // 1) Match exato por ID
      if (r.attendance_type_id === evento.attendance_type_id) return true;
      // 2) Match por nome normalizado (cobre slugs legados)
      if (normalizar(r.attendance_type_name) === normalizar(evento.attendance_type_name)) return true;
      // 3) Match entre o slug do evento e o nome da regra normalizado
      if (normalizar(r.attendance_type_name).includes(normalizar(evento.attendance_type_id))) return true;
      if (normalizar(evento.attendance_type_id).includes(normalizar(r.attendance_type_name))) return true;
      return false;
    });
  };

  const getStatusEvento = (evento) => {
    const inscricao = inscricoes.find((i) => i.event_id === evento.id);
    if (inscricao) return { label: "Inscrito", badge: "bg-green-100 text-green-800", icon: CheckCircle2 };
    const incluso = isEventoIncluso(evento);
    if (incluso) return { label: "Incluso no plano", badge: "bg-blue-100 text-blue-800", icon: Ticket };
    return { label: "Sob contratação", badge: "bg-amber-100 text-amber-800", icon: Lock };
  };

  const handleAbrirInscricao = (evento) => {
    const incluso = isEventoIncluso(evento);
    setSelectedEvent({ ...evento, incluso });
    setShowModal(true);
  };

  if (loadingEventos || loadingRules || (!!activeWorkshopId && !!planoAtual && !rulesFetched)) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3" />
        Carregando eventos...
      </div>
    );
  }

  const eventosOrdenados = [...eventosCalendario].sort(
    (a, b) => new Date(a.event_date) - new Date(b.event_date)
  );

  const eventosInclusos = eventosOrdenados.filter((e) => isEventoIncluso(e));
  const eventosNaoInclusos = eventosOrdenados.filter((e) => !isEventoIncluso(e));

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-blue-600 font-medium">Eventos Inclusos no Plano</p>
            <p className="text-2xl font-bold text-blue-800">{eventosInclusos.length}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-amber-600 font-medium">Disponíveis sob Contratação</p>
            <p className="text-2xl font-bold text-amber-800">{eventosNaoInclusos.length}</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-green-600 font-medium">Minhas Inscrições</p>
            <p className="text-2xl font-bold text-green-800">{inscricoes.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Eventos Inclusos */}
      {eventosInclusos.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Ticket className="w-4 h-4 text-blue-600" />
            Inclusos no seu plano
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {eventosInclusos.map((evento) => (
              <EventoCard
                key={evento.id}
                evento={evento}
                status={getStatusEvento(evento)}
                inscricao={inscricoes.find((i) => i.event_id === evento.id)}
                onInscrever={() => handleAbrirInscricao(evento)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Eventos Não Inclusos */}
      {eventosNaoInclusos.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-600" />
            Disponíveis sob contratação
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {eventosNaoInclusos.map((evento) => (
              <EventoCard
                key={evento.id}
                evento={evento}
                status={getStatusEvento(evento)}
                inscricao={inscricoes.find((i) => i.event_id === evento.id)}
                onInscrever={() => handleAbrirInscricao(evento)}
              />
            ))}
          </div>
        </div>
      )}

      {eventosCalendario.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <Calendar className="w-14 h-14 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">Nenhum evento disponível para {anoAtual}</p>
          <p className="text-sm mt-1">Os eventos do calendário anual aparecerão aqui quando cadastrados.</p>
        </div>
      )}

      {/* Modal de Inscrição */}
      {showModal && selectedEvent && (
        <ModalInscricao
          evento={selectedEvent}
          workshop={workshop}
          user={user}
          colaboradores={colaboradores}
          inscricaoExistente={inscricoes.find((i) => i.event_id === selectedEvent.id)}
          onClose={() => { setShowModal(false); setSelectedEvent(null); }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["evento-inscricoes", activeWorkshopId] });
            setShowModal(false);
            setSelectedEvent(null);
          }}
        />
      )}
    </div>
  );
}

function EventoCard({ evento, status, inscricao, onInscrever }) {
  const Icon = status.icon;
  const dataFormatada = evento.event_date
    ? format(new Date(evento.event_date + "T12:00:00"), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : "—";

  return (
    <div className={`border rounded-xl p-4 hover:shadow-md transition-shadow bg-white ${inscricao ? "border-green-300" : "border-gray-200"}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="font-semibold text-gray-900 text-sm">{evento.event_name}</p>
          <Badge variant="outline" className="text-xs mt-1">{evento.attendance_type_name}</Badge>
        </div>
        <Badge className={`${status.badge} flex items-center gap-1 shrink-0 text-xs`}>
          <Icon className="w-3 h-3" />
          {status.label}
        </Badge>
      </div>

      <div className="space-y-1.5 text-xs text-gray-500 mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5" />
          {dataFormatada}
        </div>
        {evento.location && (
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5" />
            {evento.location}
          </div>
        )}
        {evento.max_participants && (
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5" />
            Máx. {evento.max_participants} participantes
          </div>
        )}
        {evento.description && (
          <p className="text-gray-400 line-clamp-2 mt-1">{evento.description}</p>
        )}
      </div>

      {inscricao ? (
        <div className="flex items-center gap-2 text-xs text-green-700 font-medium bg-green-50 rounded-lg p-2">
          <CheckCircle2 className="w-4 h-4" />
          Inscrito · {inscricao.participantes?.length || 1} participante(s)
          {inscricao.status === "aguardando_pagamento" && (
            <span className="ml-1 text-amber-600">(aguardando pagamento)</span>
          )}
        </div>
      ) : (
        <Button size="sm" className="w-full" onClick={onInscrever}>
          Inscrever-se
        </Button>
      )}
    </div>
  );
}

function ModalInscricao({ evento, workshop, user, colaboradores, inscricaoExistente, onClose, onSuccess }) {
  const [participantes, setParticipantes] = useState([{ nome: "", email: "", telefone: "", employee_id: "", pre_cadastro: false }]);
  const [saving, setSaving] = useState(false);
  const [leadGerado, setLeadGerado] = useState(false);

  const addParticipante = () =>
    setParticipantes((prev) => [...prev, { nome: "", email: "", telefone: "", employee_id: "", pre_cadastro: false }]);

  const removeParticipante = (idx) =>
    setParticipantes((prev) => prev.filter((_, i) => i !== idx));

  const updateParticipante = (idx, field, value) =>
    setParticipantes((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p))
    );

  const selecionarColaborador = (idx, employeeId) => {
    if (!employeeId) {
      updateParticipante(idx, "employee_id", "");
      updateParticipante(idx, "nome", "");
      updateParticipante(idx, "email", "");
      updateParticipante(idx, "telefone", "");
      return;
    }
    const emp = colaboradores.find((c) => c.id === employeeId);
    if (emp) {
      setParticipantes((prev) =>
        prev.map((p, i) =>
          i === idx
            ? { ...p, employee_id: emp.id, nome: emp.full_name || "", email: emp.email || "", telefone: emp.telefone || "", pre_cadastro: false }
            : p
        )
      );
    }
  };

  const handleConfirmar = async () => {
    const participantesValidos = participantes.filter((p) => p.nome.trim());
    if (!participantesValidos.length) {
      toast.error("Informe ao menos um participante.");
      return;
    }

    setSaving(true);
    try {
      const status = evento.incluso ? "confirmado" : "aguardando_pagamento";

      await base44.entities.EventoInscricao.create({
        workshop_id: workshop?.id,
        workshop_name: workshop?.name || "",
        event_id: evento.id,
        event_name: evento.event_name,
        event_date: evento.event_date,
        incluso_no_plano: evento.incluso,
        status,
        responsavel_nome: user?.full_name || "",
        responsavel_email: user?.email || "",
        participantes: participantesValidos,
        lead_gerado: !evento.incluso,
      });

      if (!evento.incluso) {
        setLeadGerado(true);
        toast.success("Inscrição registrada! Nossa equipe comercial entrará em contato para finalizar.");
      } else {
        toast.success("Inscrição confirmada com sucesso!");
        onSuccess();
      }
    } catch (err) {
      toast.error("Erro ao registrar inscrição: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (leadGerado) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <AlertCircle className="w-5 h-5" />
              Inscrição Registrada
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              Sua inscrição foi registrada. Agora é necessário finalizar a parte comercial para garantir sua vaga.
            </div>
            <p className="text-sm text-gray-600">Nossa equipe comercial entrará em contato em breve para confirmar o pagamento e garantir sua participação.</p>
            <Button className="w-full" onClick={() => { onSuccess(); }}>Entendido</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-blue-600" />
            Inscrição: {evento.event_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Info do Evento */}
          <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1">
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="w-4 h-4" />
              {evento.event_date
                ? format(new Date(evento.event_date + "T12:00:00"), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                : "—"}
            </div>
            {evento.location && (
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="w-4 h-4" />
                {evento.location}
              </div>
            )}
            <Badge className={evento.incluso ? "bg-blue-100 text-blue-800 mt-1" : "bg-amber-100 text-amber-800 mt-1"}>
              {evento.incluso ? "✅ Incluso no seu plano" : "🔒 Requer contratação adicional"}
            </Badge>
          </div>

          {/* Participantes */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-semibold">Participantes</Label>
              <Button size="sm" variant="outline" onClick={addParticipante}>
                <Plus className="w-3 h-3 mr-1" /> Adicionar
              </Button>
            </div>

            <div className="space-y-4">
              {participantes.map((p, idx) => (
                <div key={idx} className="border rounded-lg p-3 space-y-3 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">Participante {idx + 1}</span>
                    {participantes.length > 1 && (
                      <Button size="sm" variant="ghost" onClick={() => removeParticipante(idx)}>
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </Button>
                    )}
                  </div>

                  {/* Seleção de colaborador cadastrado */}
                  <div>
                    <Label className="text-xs text-gray-500 mb-1 block">Colaborador cadastrado (opcional)</Label>
                    <select
                      className="w-full border rounded-md text-sm p-2 bg-white"
                      value={p.employee_id || ""}
                      onChange={(e) => selecionarColaborador(idx, e.target.value)}
                    >
                      <option value="">— Preencher manualmente —</option>
                      {colaboradores.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.full_name} {emp.position ? `(${emp.position})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Nome *</Label>
                      <Input
                        className="h-8 text-sm"
                        value={p.nome}
                        onChange={(e) => updateParticipante(idx, "nome", e.target.value)}
                        placeholder="Nome completo"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Telefone</Label>
                      <Input
                        className="h-8 text-sm"
                        value={p.telefone}
                        onChange={(e) => updateParticipante(idx, "telefone", e.target.value)}
                        placeholder="(11) 99999-9999"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">E-mail</Label>
                      <Input
                        className="h-8 text-sm"
                        value={p.email}
                        onChange={(e) => updateParticipante(idx, "email", e.target.value)}
                        placeholder="email@exemplo.com"
                      />
                    </div>
                  </div>

                  {!p.employee_id && p.nome && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 rounded p-1.5">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      Participante sem cadastro — será registrado como pré-cadastro e poderá ser vinculado depois.
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Aviso para eventos não inclusos */}
          {!evento.incluso && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Este evento não está incluso no seu plano atual. Ao confirmar, nossa equipe comercial será notificada para finalizar a contratação.</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleConfirmar} disabled={saving}>
              {saving ? "Registrando..." : evento.incluso ? "Confirmar Inscrição" : "Solicitar Vaga"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}