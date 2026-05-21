import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, User, CheckCircle2, XCircle, Loader2, Video, Mail, TrendingUp } from "lucide-react";

const NIVEL_CONFIG = {
  critico: { label: "CRÍTICO", color: "bg-red-100 text-red-700 border-red-200", dot: "bg-red-500", border: "border-l-red-500" },
  atencao: { label: "ATENÇÃO", color: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500", border: "border-l-amber-500" },
  nunca:   { label: "NUNCA ATENDIDO", color: "bg-purple-100 text-purple-700 border-purple-200", dot: "bg-purple-500", border: "border-l-purple-500" },
  ok:      { label: "OK", color: "bg-green-100 text-green-700 border-green-200", dot: "bg-green-500", border: "border-l-green-500" },
};

// tiposAtendimento, consultores são recebidos via props (buscados pelo pai)
export default function SugestaoCard({ sugestao, onAprovar, onReprovar, tiposAtendimento = [], consultores = [], onConsultorChange }) {
  const [tipoFinal, setTipoFinal] = useState(sugestao.tipo_atendimento_final || sugestao.tipo_atendimento_sugerido);
  const [dataFinal, setDataFinal] = useState(sugestao.data_final || sugestao.data_sugerida);
  const [horaFinal, setHoraFinal] = useState(sugestao.hora_final || sugestao.hora_sugerida);
  const [consultorId, setConsultorId] = useState(sugestao.consultor_id);
  const [showReprovar, setShowReprovar] = useState(false);
  const [motivoReprovacao, setMotivoReprovacao] = useState("");
  const [loading, setLoading] = useState(false);

  const cfg = NIVEL_CONFIG[sugestao.nivel_criticidade] || NIVEL_CONFIG.atencao;

  const handleAprovar = async () => {
    setLoading(true);
    const consultorSelecionado = consultores.find(c => c.id === consultorId);
    await onAprovar(sugestao.id, {
      tipoFinal,
      dataFinal,
      horaFinal,
      consultorId,
      consultorNome: consultorSelecionado?.full_name || sugestao.consultor_nome,
    });
    setLoading(false);
  };

  const handleReprovar = async () => {
    if (!motivoReprovacao.trim()) return;
    setLoading(true);
    await onReprovar(sugestao.id, motivoReprovacao);
    setLoading(false);
  };

  // Card aprovado
  if (sugestao.status === "aprovado") {
    return (
      <div className="bg-white rounded-xl border border-green-200 border-l-4 border-l-green-500 p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm text-gray-800">{sugestao.workshop_name}</p>
              <p className="text-xs text-gray-500">{sugestao.tipo_atendimento_final} · {sugestao.data_final} às {sugestao.hora_final}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">Agendado</Badge>
            {sugestao.google_meet_link && (
              <a href={sugestao.google_meet_link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] text-blue-600 hover:underline">
                <Video className="w-3 h-3" /> Meet
              </a>
            )}
            {sugestao.email_enviado && (
              <span className="flex items-center gap-1 text-[10px] text-green-600">
                <Mail className="w-3 h-3" /> E-mail enviado
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Card reprovado
  if (sugestao.status === "reprovado") {
    return (
      <div className="bg-white rounded-xl border border-gray-200 border-l-4 border-l-gray-300 p-4 shadow-sm opacity-70">
        <div className="flex items-center gap-2">
          <XCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <div>
            <p className="font-semibold text-sm text-gray-500">{sugestao.workshop_name}</p>
            <p className="text-xs text-gray-400">Reprovado · {sugestao.motivo_reprovacao}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl border border-l-4 ${cfg.border} border-gray-200 shadow-sm overflow-hidden`}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${cfg.dot}`} />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-gray-900">{sugestao.workshop_name}</span>
                <Badge className={`text-[10px] px-1.5 py-0 ${cfg.color}`}>{cfg.label}</Badge>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{sugestao.motivo_urgencia}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="flex items-center gap-1 text-[10px] text-gray-400 bg-gray-50 border border-gray-200 rounded px-2 py-1">
              <TrendingUp className="w-3 h-3" />
              <span className="font-bold text-gray-600">{sugestao.score_prioridade}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Editable fields */}
      <div className="px-4 pb-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
        {/* Tipo */}
        <div>
          <label className="text-[10px] text-gray-400 font-medium uppercase tracking-wide block mb-1">Tipo de Atendimento</label>
          <Select value={tipoFinal} onValueChange={setTipoFinal}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tiposAtendimento.map(t => (
                <SelectItem key={t.id || t.nome} value={t.nome} className="text-xs">{t.nome}</SelectItem>
              ))}
              {/* Fallback: se o tipo sugerido não está na lista, mostra assim mesmo */}
              {sugestao.tipo_atendimento_sugerido && !tiposAtendimento.find(t => t.nome === sugestao.tipo_atendimento_sugerido) && (
                <SelectItem value={sugestao.tipo_atendimento_sugerido} className="text-xs font-medium text-purple-700">
                  ✨ {sugestao.tipo_atendimento_sugerido} (IA)
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Data */}
        <div>
          <label className="text-[10px] text-gray-400 font-medium uppercase tracking-wide block mb-1">
            <Calendar className="w-3 h-3 inline mr-1" />Data
          </label>
          <input
            type="date"
            value={dataFinal}
            onChange={e => setDataFinal(e.target.value)}
            className="w-full h-8 text-xs border border-gray-200 rounded-md px-2 focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
        </div>

        {/* Hora */}
        <div>
          <label className="text-[10px] text-gray-400 font-medium uppercase tracking-wide block mb-1">
            <Clock className="w-3 h-3 inline mr-1" />Horário
          </label>
          <input
            type="time"
            value={horaFinal}
            onChange={e => setHoraFinal(e.target.value)}
            className="w-full h-8 text-xs border border-gray-200 rounded-md px-2 focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
        </div>
      </div>

      {/* Consultor + ações */}
      <div className="px-4 pb-3 flex items-center justify-between gap-3 border-t border-gray-100 pt-3">
        <div className="flex items-center gap-1.5 min-w-0">
          <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          {consultores.length > 1 ? (
            <Select value={consultorId} onValueChange={(v) => {
              setConsultorId(v);
              onConsultorChange?.(sugestao.id, v, consultores.find(c => c.id === v)?.full_name);
            }}>
              <SelectTrigger className="h-7 text-xs border-gray-200 w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {consultores.map(c => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">{c.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="text-xs text-gray-500">{sugestao.consultor_nome}</span>
          )}
        </div>

        {!showReprovar ? (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => setShowReprovar(true)}
              disabled={loading}
            >
              <XCircle className="w-3.5 h-3.5 mr-1" />
              Reprovar
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white"
              onClick={handleAprovar}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
              Aprovar e Agendar
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1 justify-end">
            <input
              type="text"
              placeholder="Motivo da reprovação..."
              value={motivoReprovacao}
              onChange={e => setMotivoReprovacao(e.target.value)}
              className="flex-1 max-w-xs h-8 text-xs border border-gray-200 rounded-md px-2 focus:outline-none focus:ring-2 focus:ring-red-200"
              autoFocus
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-gray-400"
              onClick={() => { setShowReprovar(false); setMotivoReprovacao(""); }}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white"
              onClick={handleReprovar}
              disabled={loading || !motivoReprovacao.trim()}
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Confirmar"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}