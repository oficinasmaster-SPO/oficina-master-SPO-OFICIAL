import React from "react";
import { format } from "date-fns";
import { Phone, Mail, MessageCircle, FileText, CalendarCheck } from "lucide-react";

const CANAL_MAP = {
  ligacao:    { icon: Phone,          label: "Ligação",    color: "text-blue-600",   bg: "bg-blue-50 border-blue-200" },
  email:      { icon: Mail,           label: "E-mail",     color: "text-purple-600", bg: "bg-purple-50 border-purple-200" },
  whatsapp:   { icon: MessageCircle,  label: "WhatsApp",   color: "text-green-600",  bg: "bg-green-50 border-green-200" },
  video:      { icon: FileText,       label: "Vídeo",      color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-200" },
  presencial: { icon: CalendarCheck,  label: "Presencial", color: "text-gray-600",   bg: "bg-gray-50 border-gray-200" },
};

const avatarColors = [
  "bg-blue-100 text-blue-700",
  "bg-purple-100 text-purple-700",
  "bg-emerald-100 text-emerald-700",
  "bg-orange-100 text-orange-700",
  "bg-pink-100 text-pink-700",
];

function getInitials(name = "") {
  return name.split(" ").slice(0, 2).map(p => p[0]).join("").toUpperCase() || "?";
}

function getAvatarColor(name = "") {
  return avatarColors[name.charCodeAt(0) % avatarColors.length];
}

function safeDateFormat(dateStr, fmt) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr.includes("T") ? dateStr : dateStr + "T00:00:00");
    if (isNaN(d.getTime())) return "—";
    return format(d, fmt);
  } catch {
    return "—";
  }
}

const HUMOR_MAP = {
  "😊": { emoji: "😊", label: "Feliz",        color: "text-green-600 bg-green-50 border-green-200" },
  "😐": { emoji: "😐", label: "Neutro",       color: "text-gray-600 bg-gray-50 border-gray-200" },
  "😞": { emoji: "😞", label: "Triste",       color: "text-red-600 bg-red-50 border-red-200" },
  "😠": { emoji: "😠", label: "Irritado",     color: "text-red-700 bg-red-50 border-red-200" },
  "😄": { emoji: "😄", label: "Animado",      color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  "😓": { emoji: "😓", label: "Preocupado",   color: "text-amber-600 bg-amber-50 border-amber-200" },
};

function renderHumor(humor) {
  if (!humor) return <span className="text-gray-300">—</span>;
  const cfg = HUMOR_MAP[humor];
  if (cfg) {
    return (
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[11px] font-medium ${cfg.color}`}>
        {cfg.emoji} {cfg.label}
      </span>
    );
  }
  // texto livre
  return <span className="text-gray-600 text-[11px] truncate">{humor}</span>;
}

export default function FollowUpConcluidoRow({ completed, reminder, ata, totalFollowUps, onSelect }) {
  const canal = completed?.canal?.toLowerCase();
  const canalCfg = CANAL_MAP[canal] || null;
  const CanalIcon = canalCfg?.icon || null;

  const clienteName = reminder?.workshop_name || completed?.workshop_name || "—";
  const dataContato = completed?.dataContato || reminder?.reminder_date;
  const dataConc = completed?.completedAt || reminder?.completed_at;
  const consultorResponsavel = reminder?.consultor_nome || completed?.consultor_nome || "—";
  const quemRealizou = completed?.consultor_nome || completed?.created_by || "—";
  const humor = completed?.humor || null;

  const ataCode = ata?.code || null;
  const tipoReuniao = ata?.tipo_aceleracao || ata?.tipo_atendimento || null;

  const proxData = completed?.proxData;
  const proxHora = completed?.proxHora;

  const fuTotal = totalFollowUps ?? "—";

  return (
    <button
      onClick={() => onSelect && onSelect()}
      className="w-full text-left hover:bg-green-50/40 transition-colors px-4 py-2.5 border-b border-gray-100 last:border-b-0 min-w-[1100px]"
    >
      <div className="flex items-center gap-2 text-xs min-w-0">

        {/* Nº FU do cliente */}
        <div className="w-10 flex-shrink-0 text-center">
          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${
            typeof fuTotal === "number" && fuTotal >= 50 ? "bg-red-100 text-red-700" :
            typeof fuTotal === "number" && fuTotal >= 20 ? "bg-orange-100 text-orange-700" :
            typeof fuTotal === "number" && fuTotal >= 10 ? "bg-amber-100 text-amber-700" :
            "bg-gray-100 text-gray-600"
          }`}>
            #{fuTotal}
          </span>
        </div>

        {/* Nome do Cliente */}
        <div className="w-36 flex-shrink-0 flex items-center gap-1.5 min-w-0">
          <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${getAvatarColor(clienteName)}`}>
            {getInitials(clienteName)}
          </div>
          <span className="text-gray-800 font-semibold truncate">{clienteName}</span>
        </div>

        {/* Data/Hora */}
        <div className="w-20 flex-shrink-0">
          <div className="text-gray-700 font-medium">{safeDateFormat(dataContato, "dd/MM/yy")}</div>
          <div className="text-gray-400">{safeDateFormat(dataConc, "HH:mm")}</div>
        </div>

        {/* Consultor Responsável */}
        <div className="w-28 flex-shrink-0 text-gray-600 truncate">
          {consultorResponsavel}
        </div>

        {/* Quem Realizou */}
        <div className="w-28 flex-shrink-0 text-gray-600 truncate">
          {quemRealizou !== consultorResponsavel ? (
            <span className="text-indigo-700 font-medium truncate">{quemRealizou}</span>
          ) : (
            <span className="text-gray-400 text-[11px]">— mesmo</span>
          )}
        </div>

        {/* Humor */}
        <div className="w-20 flex-shrink-0">
          {renderHumor(humor)}
        </div>

        {/* Canal */}
        <div className="w-20 flex-shrink-0">
          {canalCfg ? (
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-xs ${canalCfg.color} ${canalCfg.bg}`}>
              {CanalIcon && <CanalIcon className="w-3 h-3" />}
              {canalCfg.label}
            </span>
          ) : (
            <span className="text-gray-300">—</span>
          )}
        </div>

        {/* ATA */}
        <div className="w-20 flex-shrink-0">
          {ataCode ? (
            <span className="text-gray-500 font-mono text-[11px]">{ataCode}</span>
          ) : (
            <span className="text-gray-300">—</span>
          )}
        </div>

        {/* Tipo Atendimento */}
        <div className="w-24 flex-shrink-0">
          {tipoReuniao ? (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-purple-700 bg-purple-50 border border-purple-100 px-1.5 py-0.5 rounded-full font-medium truncate max-w-full">
              <FileText className="w-2.5 h-2.5 flex-shrink-0" />
              <span className="truncate">{tipoReuniao}</span>
            </span>
          ) : (
            <span className="text-gray-300">—</span>
          )}
        </div>

        {/* Próximo Contato */}
        <div className="w-24 flex-shrink-0 text-gray-500">
          {proxData ? (
            <>
              <div className="font-medium">{safeDateFormat(proxData, "dd/MM/yy")}</div>
              {proxHora && <div className="text-gray-400">{proxHora}</div>}
            </>
          ) : (
            <span className="text-gray-300">—</span>
          )}
        </div>

        {/* Status */}
        <div className="flex-shrink-0 ml-auto">
          <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
            ✓ Concluído
          </span>
        </div>

      </div>
    </button>
  );
}