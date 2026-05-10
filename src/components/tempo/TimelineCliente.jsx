import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Video, Phone, Mail, MessageCircle, X } from "lucide-react";

function fmt(min) {
  if (!min) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m > 0 ? m + "min" : ""}`.trim() : `${m}min`;
}

const canalIcons = {
  ligacao: Phone,
  whatsapp: MessageCircle,
  email: Mail,
  video: Video,
  presencial: Video,
};

const canalColors = {
  ligacao: "text-green-600 bg-green-50",
  whatsapp: "text-green-500 bg-green-50",
  email: "text-blue-600 bg-blue-50",
  video: "text-purple-600 bg-purple-50",
  presencial: "text-gray-600 bg-gray-50",
};

export default function TimelineCliente({ cliente, onClose }) {
  const wsId = cliente?.workshop_id;

  const { data: atendimentos = [] } = useQuery({
    queryKey: ['timeline-atendimentos', wsId],
    queryFn: () => base44.entities.ConsultoriaAtendimento.filter(
      { workshop_id: wsId, status: { '$in': ['realizado', 'concluido'] } },
      '-data_realizada', 50
    ),
    enabled: !!wsId,
  });

  const { data: followupReminders = [] } = useQuery({
    queryKey: ['timeline-fup-reminders', wsId],
    queryFn: () => base44.entities.FollowUpReminder.filter(
      { workshop_id: wsId, is_completed: true },
      '-completed_at', 100
    ),
    enabled: !!wsId,
  });

  const { data: followupsConcluidos = [] } = useQuery({
    queryKey: ['timeline-fup-concluidos', wsId],
    queryFn: () => base44.entities.FollowUpConcluido.filter({ workshop_id: wsId }, '-completedAt', 100),
    enabled: !!wsId,
  });

  // Montar linha do tempo unificada
  const eventos = [
    ...atendimentos.map(a => ({
      tipo: 'reuniao',
      data: a.data_realizada || a.data_agendada,
      titulo: a.tipo_atendimento?.replace(/_/g, ' ') || 'Reunião',
      duracao: a.duracao_real_minutos || a.duracao_minutos,
      consultor: a.consultor_nome,
      status: a.status,
    })),
    ...followupsConcluidos.map(f => ({
      tipo: 'followup',
      data: f.completedAt || f.dataContato,
      titulo: `Follow-up • ${f.canal || ''}`,
      duracao: f.duracao,
      consultor: f.consultor_nome,
      canal: f.canal,
      resultado: f.resultado,
    })),
  ].sort((a, b) => new Date(b.data) - new Date(a.data));

  if (!cliente) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            📋 {cliente.workshop_name}
          </CardTitle>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="flex gap-4 text-sm text-gray-600 mt-1">
          <span>🎯 <strong className="text-blue-600">{fmt(cliente.minutos_reuniao)}</strong> em reuniões</span>
          <span>📞 <strong className="text-orange-500">{fmt(cliente.minutos_followup)}</strong> em follow-ups</span>
          <span>⏱️ <strong>{fmt(cliente.total_minutos)}</strong> total</span>
        </div>
      </CardHeader>
      <CardContent className="p-0 max-h-80 overflow-y-auto">
        {eventos.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Nenhuma atividade registrada</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {eventos.map((ev, i) => {
              const isReuniao = ev.tipo === 'reuniao';
              const IconCanal = ev.canal ? canalIcons[ev.canal] : null;
              const canalClass = ev.canal ? canalColors[ev.canal] : '';
              return (
                <div key={i} className="flex items-center gap-3 px-5 py-2.5">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isReuniao ? 'bg-blue-500' : 'bg-orange-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 capitalize truncate">{ev.titulo}</p>
                    {ev.consultor && <p className="text-xs text-gray-400">{ev.consultor}</p>}
                  </div>
                  {IconCanal && (
                    <span className={`p-1 rounded text-xs ${canalClass}`}>
                      <IconCanal className="w-3.5 h-3.5" />
                    </span>
                  )}
                  {ev.duracao > 0 && (
                    <span className={`text-xs font-semibold ${isReuniao ? 'text-blue-600' : 'text-orange-500'}`}>
                      {fmt(ev.duracao)}
                    </span>
                  )}
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {ev.data ? new Date(ev.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}