import React, { useEffect } from "react";
import RegistrarAtendimento from "@/pages/RegistrarAtendimento";

/**
 * Modal flutuante para editar/criar atendimentos.
 * Fecha com ESC, clique no fundo ou botão X.
 * Dados não salvos são perdidos ao fechar sem salvar.
 */
export default function AtendimentoModal({ atendimentoId, onClose }) {
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <RegistrarAtendimento
      isModal={true}
      atendimentoId={atendimentoId}
      onClose={onClose}
    />
  );
}