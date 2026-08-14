import React, { useEffect, useRef, useState } from "react";
import SidePanelDashboard from "./SidePanelDashboard";
import CockpitPanel from "../CockpitPanel";
import { useSidePanelPriorities } from "./useSidePanelPriorities";

/**
 * SidePanel — orquestra o flip 3D entre Central Operacional (face A)
 * e Cockpit do Cliente (face B = CockpitPanel existente).
 *
 * Máquina de estados:
 *   dashboard → (seleciona cliente) → cockpit
 *   cockpit  → (volta)             → dashboard
 *   cockpit A → (troca cliente)    → cockpit B (fade, sem voltar ao dashboard)
 */
export default function SidePanel({
  reminder, seqNum, stats, today,
  onIniciarAtendimento, onClear,
  prioridadeData, activePill, onPrioridadeClick, onSelectReminder,
}) {
  const [period, setPeriod] = useState("today"); // 'today' | 'week' | 'month'

  const { metrics, insight, allClear, actions, coverage } = useSidePanelPriorities({
    reminders: prioridadeData?.reminders || [],
    remindersConcluidos: prioridadeData?.remindersConcluidos || [],
    today,
    period,
  });

  const [face, setFace] = useState("dashboard"); // 'dashboard' | 'cockpit'
  const [displayedReminder, setDisplayedReminder] = useState(null);
  const [contentOpacity, setContentOpacity] = useState(1);
  const lastReminderId = useRef(null);

  useEffect(() => {
    const newId = reminder?.id || null;
    if (newId === lastReminderId.current) return;
    const prevId = lastReminderId.current;
    lastReminderId.current = newId;

    setContentOpacity(0);

    if (newId && !prevId) {
      // dashboard → cockpit
      setFace("cockpit");
      const t = setTimeout(() => {
        setDisplayedReminder(reminder);
        setContentOpacity(1);
      }, 175);
      return () => clearTimeout(t);
    } else if (!newId && prevId) {
      // cockpit → dashboard
      setFace("dashboard");
      const t = setTimeout(() => {
        setDisplayedReminder(null);
        setContentOpacity(1);
      }, 175);
      return () => clearTimeout(t);
    } else if (newId && prevId) {
      // cockpit A → cockpit B (fade, rotação permanece)
      const t = setTimeout(() => {
        setDisplayedReminder(reminder);
        setContentOpacity(1);
      }, 175);
      return () => clearTimeout(t);
    }
  }, [reminder]);

  const rotation = face === "cockpit" ? 180 : 0;

  return (
    <div className="side-panel" style={{ perspective: "1400px", height: "calc(100vh - 6rem)" }}>
      <div
        className="side-panel__inner"
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          transformStyle: "preserve-3d",
          transition: "transform 350ms cubic-bezier(.4,0,.2,1)",
          transform: `rotateY(${rotation}deg)`,
        }}
      >
        {/* Face A — Central Operacional (frente) */}
        <div
          className="side-panel__face"
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            // S4-FIX: face inativa não deve capturar wheel/pointer events
            pointerEvents: face === "dashboard" ? "auto" : "none",
            overflowY: face === "dashboard" ? "auto" : "hidden",
          }}
        >
          <SidePanelDashboard
            metrics={metrics}
            insight={insight}
            allClear={allClear}
            actions={actions}
            activePill={activePill}
            period={period}
            onPeriodChange={setPeriod}
            coverage={coverage}
            onCardClick={onPrioridadeClick}
            onActionClick={(a) => {
              // Ações agregadas (Semana/Mês) abrem a lista filtrada;
              // ações do modo Hoje abrem o cockpit do cliente.
              if (a?.pillId) onPrioridadeClick?.(a.pillId);
              else onSelectReminder?.(a?.reminder);
            }}
          />
        </div>

        {/* Face B — Cockpit do Cliente (verso) */}
        <div
          className="side-panel__face"
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            // S4-FIX: face inativa não deve capturar wheel/pointer events
            pointerEvents: face === "cockpit" ? "auto" : "none",
            overflowY: face === "cockpit" ? "auto" : "hidden",
          }}
        >
          <div
            className="cockpit-enter"
            style={{
              opacity: face === "cockpit" ? contentOpacity : 0,
              transition: "opacity 175ms ease",
              height: "100%",
            }}
          >
            <CockpitPanel
              reminder={displayedReminder}
              seqNum={seqNum}
              stats={stats}
              today={today}
              onIniciarAtendimento={onIniciarAtendimento}
              onClear={onClear}
            />
          </div>
        </div>
      </div>
    </div>
  );
}