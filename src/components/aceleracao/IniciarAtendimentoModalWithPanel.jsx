/**
 * IniciarAtendimentoModalWithPanel
 *
 * Wrapper fino sobre IniciarAtendimentoModal que injeta o
 * ClientHistoryFloatingPanel arrastável durante o atendimento de follow-up.
 *
 * Responsabilidades:
 *  - Gerenciar visibilidade do painel (showPanel state)
 *  - Sincronizar workshopId/workshopName/planId com o followUp atual
 *  - Não alterar NENHUMA lógica de negócio do modal original
 *
 * TDD: lógica de estado coberta em
 *   tests/floating-panel/iniciarAtendimentoModal.floatingPanel.test.js
 */
import React, { useState, useCallback } from "react";
import IniciarAtendimentoModal from "@/components/aceleracao/IniciarAtendimentoModal";
import ClientHistoryFloatingPanel from "@/components/aceleracao/ClientHistoryFloatingPanel";

export default function IniciarAtendimentoModalWithPanel(props) {
  const { followUp: followUpProp, ...rest } = props;

  // followUp corrente (pode mudar via navegação interna do modal)
  const [currentFollowUp, setCurrentFollowUp] = useState(followUpProp);

  // Painel visível por padrão, mas não força reabertura ao trocar de FU
  const [showPanel, setShowPanel] = useState(true);

  // Intercepta onNavegar para rastrear o followUp atual sem alterar a lógica do modal
  const handleNavegar = useCallback((fu) => {
    setCurrentFollowUp(fu);
    props.onNavegar?.(fu);
  }, [props.onNavegar]);

  return (
    <>
      <IniciarAtendimentoModal
        {...rest}
        followUp={followUpProp}
        onNavegar={handleNavegar}
      />

      {showPanel && currentFollowUp?.workshop_id && (
        <ClientHistoryFloatingPanel
          workshopId={currentFollowUp.workshop_id}
          workshopName={currentFollowUp.workshop_name}
          planId={currentFollowUp.plano || null}
          onClose={() => setShowPanel(false)}
        />
      )}
    </>
  );
}