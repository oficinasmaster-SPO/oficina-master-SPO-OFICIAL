import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import {
  Calendar, FileText, Bell, ChevronDown, ChevronRight,
  User, CheckCircle2, Clock, AlertCircle, ListChecks
} from "lucide-react";

const statusAtendimentoConfig = {
  realizado: { label: "Realizado", color: "bg-green-100 text-green-700" },
  cancelado: { label: "Cancelado", color: "bg-red-100 text-red-700" },
  agendado:  { label: "Agendado",  color: "bg-blue-100 text-blue-700" },
  faltou:    { label: "Faltou",    color: "bg-orange-100 text-orange-700" },
};

function FollowUpRow({ fu }) {
  const date = new Date(fu.reminder_date + "T00:00:00");
  const isPast = date < new Date();
  const status = fu.is_completed
    ? { label: "Concluído", color: "bg-green-100 text-green-700", icon: CheckCircle2 }
    : isPast
    ? { label: "Pendente",  color: "bg-red-100 text-red-700",   icon: AlertCircle }
    : { label: "Agendado",  color: "bg-amber-100 text-amber-700", icon: Clock };

  const StatusIcon = status.icon;

  return (
    <div className="flex items-start gap-3 py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors">
      <div className="mt-0.5 w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
        <Bell className="w-3 h-3 text-amber-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-gray-700">
            Follow-up #{fu.sequence_number} 
            <span className="font-normal text-gray-500 ml-1">
              — {fu.days_since_meeting} dias após o atendimento
            </span>
          </span>
          <Badge className={`text-xs shrink-0 flex items-center gap-1 ${status.color}`}>
            <StatusIcon className="w-3 h-3" />
            {status.label}
          </Badge>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          {format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          {fu.consultor_nome && ` · ${fu.consultor_nome}`}
        </p>
        {fu.notes && (
          <p className="text-xs text-gray-500 mt-1 italic">"{fu.notes}"</p>
        )}
      </div>
    </div>
  );
}

function AtaRow({ ata }) {
  return (
    <div className="flex items-start gap-3 py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors">
      <div className="mt-0.5 w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
        <FileText className="w-3 h-3 text-purple-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-gray-700">
            {ata.code ? `ATA · ${ata.code}` : "ATA"}
            {ata.tipo_aceleracao && <span className="font-normal text-gray-500 ml-1">— {ata.tipo_aceleracao}</span>}
          </span>
          <Badge className={`text-xs shrink-0 ${ata.status === "finalizada" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
            {ata.status === "finalizada" ? "Finalizada" : "Rascunho"}
          </Badge>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          {format(new Date(ata.meeting_date + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}
          {ata.meeting_time && ` às ${ata.meeting_time}`}
          {ata.consultor_name && ` · ${ata.consultor_name}`}
        </p>
        {ata.proximos_passos_list?.length > 0 && (
          <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
            <ListChecks className="w-3 h-3" />
            {ata.proximos_passos_list.length} próximos passo(s) registrado(s)
          </div>
        )}
      </div>
    </div>
  );
}

function AtendimentoCard({ atendimento, atas, followups }) {
  const [open, setOpen] = useState(false);

  // Busca pelo ata_id salvo no atendimento OU pelo atendimento_id na ATA
  const ataVinculada = atas.find(a => a.id === atendimento.ata_id || a.atendimento_id === atendimento.id);
  const followupsVinculados = followups
    .filter(f => f.atendimento_id === atendimento.id)
    .sort((a, b) => a.sequence_number - b.sequence_number);

  const totalSubitens = (ataVinculada ? 1 : 0) + followupsVinculados.length;

  const date = new Date(atendimento.data_realizada || atendimento.data_agendada);
  const statusCfg = statusAtendimentoConfig[atendimento.status] || { label: atendimento.status, color: "bg-gray-100 text-gray-700" };

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${open ? "border-blue-200 shadow-sm" : "border-gray-200"}`}>
      {/* Header do atendimento */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left"
      >
        <div className={`p-1.5 rounded-lg border bg-blue-50 border-blue-200 shrink-0`}>
          <Calendar className="w-4 h-4 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-gray-900">
              {atendimento.tipo_atendimento || "Atendimento"}
            </span>
            <Badge className={`text-xs ${statusCfg.color}`}>{statusCfg.label}</Badge>
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
            <span>{format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
            {atendimento.consultor_nome && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {atendimento.consultor_nome}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {totalSubitens > 0 && (
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {totalSubitens} {totalSubitens === 1 ? "item" : "itens"}
            </span>
          )}
          {open
            ? <ChevronDown className="w-4 h-4 text-gray-400" />
            : <ChevronRight className="w-4 h-4 text-gray-400" />
          }
        </div>
      </button>

      {/* Conteúdo expandido */}
      {open && (
        <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-3 space-y-1">
          {atendimento.objetivo && (
            <p className="text-xs text-gray-500 mb-3 italic pl-1">"{atendimento.objetivo}"</p>
          )}

          {/* ATA vinculada */}
          {ataVinculada ? (
            <AtaRow ata={ataVinculada} />
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-gray-400">
              <FileText className="w-3.5 h-3.5" />
              Nenhuma ATA vinculada a este atendimento
            </div>
          )}

          {/* Divisor */}
          {followupsVinculados.length > 0 && (
            <div className="border-t border-gray-100 pt-1 mt-1">
              {followupsVinculados.map(fu => (
                <FollowUpRow key={fu.id} fu={fu} />
              ))}
            </div>
          )}

          {followupsVinculados.length === 0 && (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-gray-400">
              <Bell className="w-3.5 h-3.5" />
              Nenhum follow-up registrado
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ClientHistoricoTimeline({ client }) {
  const workshopId = client?.id;

  const { data: atendimentos = [], isLoading: loadingAtendimentos } = useQuery({
    queryKey: ["atendimentos-historico-cliente", workshopId],
    queryFn: () => base44.entities.ConsultoriaAtendimento.filter({ workshop_id: workshopId }, "-data_agendada", 200),
    enabled: !!workshopId
  });

  const { data: atas = [] } = useQuery({
    queryKey: ["atas-historico", workshopId],
    queryFn: () => base44.entities.MeetingMinutes.filter({ workshop_id: workshopId }, "-meeting_date", 100),
    enabled: !!workshopId
  });

  const { data: followups = [] } = useQuery({
    queryKey: ["followups-historico", workshopId],
    queryFn: () => base44.entities.FollowUpReminder.filter({ workshop_id: workshopId }, "-reminder_date", 100),
    enabled: !!workshopId
  });

  const clienteAtendimentos = [...atendimentos]
    .sort((a, b) => new Date(b.data_realizada || b.data_agendada) - new Date(a.data_realizada || a.data_agendada));

  if (loadingAtendimentos) {
    return (
      <div className="text-center py-16 text-gray-400">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Carregando histórico...</p>
      </div>
    );
  }

  if (clienteAtendimentos.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p className="text-sm">Nenhum atendimento encontrado para este cliente</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{clienteAtendimentos.length} atendimento(s) registrado(s)</p>
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1"><FileText className="w-3 h-3 text-purple-400" /> ATA</span>
          <span className="flex items-center gap-1"><Bell className="w-3 h-3 text-amber-400" /> Follow-up</span>
        </div>
      </div>

      {clienteAtendimentos.map(atendimento => (
        <AtendimentoCard
          key={atendimento.id}
          atendimento={atendimento}
          atas={atas}
          followups={followups}
        />
      ))}
    </div>
  );
}