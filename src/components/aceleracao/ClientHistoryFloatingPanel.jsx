/**
 * ClientHistoryFloatingPanel
 * 
 * Painel flutuante e arrastável que exibe, para um dado workshopId:
 *  - Plano atual do cliente
 *  - Atendimentos do bucket (ContractAttendance) com contador por tipo
 *  - Atendimentos realizados (ConsultoriaAtendimento) para comparação
 * 
 * Comportamento:
 *  - Aparece automaticamente quando workshopId é definido
 *  - Pode ser arrastado livremente pela tela
 *  - Pode ser minimizado/restaurado sem fechar
 *  - Troca de cliente (novo workshopId) → re-fetch automático, posição mantida
 *  - Não bloqueia o formulário — position: fixed, fora do fluxo
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { X, Minus, Maximize2, Loader2, BarChart2 } from "lucide-react";

const PLAN_COLORS = {
  FREE:    "bg-gray-100 text-gray-600",
  START:   "bg-blue-100 text-blue-700",
  BRONZE:  "bg-orange-100 text-orange-700",
  PRATA:   "bg-slate-100 text-slate-700",
  GOLD:    "bg-yellow-100 text-yellow-700",
  IOM:     "bg-purple-100 text-purple-700",
  MILLIONS:"bg-emerald-100 text-emerald-700",
};

function StatusBar({ done, total }) {
  const pct = total > 0 ? Math.min((done / total) * 100, 100) : 0;
  const color = pct >= 100 ? "bg-green-500" : pct >= 50 ? "bg-blue-500" : "bg-amber-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[10px] font-bold tabular-nums ${pct >= 100 ? "text-green-600" : "text-gray-500"}`}>
        {done}/{total}
      </span>
    </div>
  );
}

export default function ClientHistoryFloatingPanel({ workshopId, workshopName, planId, onClose }) {
  const [minimized, setMinimized] = useState(false);
  const [pos, setPos] = useState(() => ({
    x: Math.max(window.innerWidth - 320, 20),
    y: 80,
  }));
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null); // { bucketByType, realizadosByType, planId, workshopName }

  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const panelRef = useRef(null);

  // ── Fetch dados do cliente ──────────────────────────────────────────────
  useEffect(() => {
    if (!workshopId) return;
    let cancelled = false;
    setLoading(true);
    setData(null);

    const load = async () => {
      try {
        const [buckets, realizados] = await Promise.all([
          base44.entities.ContractAttendance.filter({ workshop_id: workshopId }, null, 200),
          base44.entities.ConsultoriaAtendimento.filter({ workshop_id: workshopId }, '-data_agendada', 100),
        ]);
        if (cancelled) return;

        // Agrupar bucket por tipo com deduplicação
        // PROBLEMA: repairMigratedAttendances regenerou atendimentos SEM link com ConsultoriaAtendimento realizados
        // SOLUÇÃO: deduplicar por tipo, priorizando o que tem consultoria_atendimento_id ou data mais antiga
        const migratedCount = (buckets || []).filter(b => b.attendance_type_id === 'migrated').length;
        
        // Step 1: Agrupar por tipo
        const groupedByType = {};
        for (const b of (buckets || [])) {
          const key = b.attendance_type_id;
          if (!key || key === 'migrated') continue;
          if (!groupedByType[key]) {
            groupedByType[key] = [];
          }
          groupedByType[key].push(b);
        }
        
        // Step 2: Deduplicar — priorizar o que tem consultoria_atendimento_id, senão o mais antigo
        const bucketByType = {};
        for (const [typeId, items] of Object.entries(groupedByType)) {
          const withLink = items.filter(a => a.consultoria_atendimento_id);
          let selected;
          
          if (withLink.length > 0) {
            // Priorizar o que tem link (ordenar por data para pegar o mais antigo se múltiplos)
            withLink.sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));
            selected = withLink[0];
          } else {
            // Nenhum tem link → pegar o mais antigo
            items.sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));
            selected = items[0];
          }
          
          bucketByType[typeId] = {
            name: selected.attendance_type_name || typeId,
            total: 1, // Após dedup, sempre 1 por tipo
            done: selected.consultoria_atendimento_id ? 1 : 0
          };
        }

        // Últimos atendimentos realizados (máx 5 para exibição)
        const ultimos = (realizados || [])
          .filter(a => a.status === "realizado" || a.status === "concluido")
          .slice(0, 5)
          .map(a => ({
            tipo: a.tipo_atendimento || "—",
            consultor: a.consultor_nome || null,
            data: a.data_agendada ? a.data_agendada.split("T")[0] : null,
          }));

        setData({ bucketByType, ultimos, migratedCount });
      } catch {
        // falha silenciosa — painel simplesmente mostra estado vazio
        if (!cancelled) setData({ bucketByType: {}, ultimos: [] });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [workshopId]);

  // ── Drag handlers ───────────────────────────────────────────────────────
  const onMouseDown = useCallback((e) => {
    if (e.target.closest("button")) return;
    dragging.current = true;
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();

    const onMove = (ev) => {
      if (!dragging.current) return;
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - 280, ev.clientX - offset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 48, ev.clientY - offset.current.y)),
      });
    };
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [pos]);

  if (!workshopId) return null;

  const planColor = PLAN_COLORS[planId] || PLAN_COLORS.FREE;
  const bucketEntries = data ? Object.entries(data.bucketByType) : [];
  const totalTypes = bucketEntries.length;
  const completedTypes = bucketEntries.filter(([, v]) => v.done >= v.total && v.total > 0).length;

  return (
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        zIndex: 99999,
        width: 288,
        userSelect: "none",
      }}
      className="rounded-xl shadow-2xl border border-gray-200 bg-white flex flex-col overflow-hidden"
      data-testid="client-history-floating-panel"
    >
      {/* Header — drag handle */}
      <div
        onMouseDown={onMouseDown}
        className="flex items-center gap-2 px-3 py-2 bg-gray-900 text-white cursor-grab active:cursor-grabbing select-none"
      >
        <BarChart2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        <p className="text-xs font-semibold truncate flex-1" title={workshopName}>
          {workshopName || "Cliente"}
        </p>
        {planId && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${planColor}`}>
            {planId}
          </span>
        )}
        <button
          onClick={() => setMinimized(m => !m)}
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-700 transition-colors"
          title={minimized ? "Expandir" : "Minimizar"}
        >
          {minimized ? <Maximize2 className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
        </button>
        <button
          onClick={onClose}
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-600 transition-colors"
          title="Fechar"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Body */}
      {!minimized && (
        <div className="flex flex-col max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            </div>
          ) : !data ? null : (
            <>
              {/* Resumo geral */}
              {totalTypes > 0 && (
                <div className="px-3 pt-2 pb-1 border-b border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">
                    Atendimentos do Plano
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-gray-900">{completedTypes}</span>
                    <span className="text-xs text-gray-400">/{totalTypes} tipos concluídos</span>
                  </div>
                </div>
              )}

              {/* Aviso de dados legados pendentes de repair */}
              {data.migratedCount > 0 && bucketEntries.length === 0 && (
                <div className="mx-3 my-2 px-2 py-1.5 bg-amber-50 border border-amber-200 rounded text-[10px] text-amber-700 leading-snug">
                  ⚠️ Atendimentos do plano em migração. Execute <span className="font-bold">repairMigratedAttendances</span> para corrigir.
                </div>
              )}

              {/* Lista por tipo */}
              {bucketEntries.length > 0 ? (
                <div className="px-3 py-2 space-y-2.5">
                  {bucketEntries.map(([typeId, { name, done, total }]) => (
                    <div key={typeId}>
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-[11px] text-gray-700 font-medium truncate flex-1 mr-2" title={name}>
                          {name}
                        </p>
                        {done >= total && total > 0 && (
                          <span className="text-[9px] font-bold text-green-600 bg-green-50 px-1 rounded flex-shrink-0">✓</span>
                        )}
                      </div>
                      <StatusBar done={done} total={total} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-gray-400 italic text-center py-4 px-3">
                  Nenhum atendimento de plano encontrado
                </p>
              )}

              {/* Últimos realizados */}
              {data.ultimos?.length > 0 && (
                <div className="border-t border-gray-100 px-3 py-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                    Últimos Realizados
                  </p>
                  <div className="space-y-1">
                    {data.ultimos.map((a, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-blue-400 flex-shrink-0" />
                        <span className="text-[11px] text-gray-600 truncate flex-1">{a.tipo}</span>
                        {a.consultor && (
                          <span className="text-[10px] text-blue-500 truncate max-w-[70px]" title={a.consultor}>
                            {a.consultor.split(" ")[0]}
                          </span>
                        )}
                        {a.data && (
                          <span className="text-[10px] text-gray-400 flex-shrink-0">
                            {a.data.split("-").reverse().join("/")}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}