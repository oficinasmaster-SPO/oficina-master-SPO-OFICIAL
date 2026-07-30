import React, { memo } from "react";

/**
 * FAB "Suporte" — abre o fluxo de Suporte Rápido (follow-up ad-hoc rastreável).
 * Estilo: pílula amarelo-pálido (#FFFF99) com ícone de boia e "Suporte" abaixo.
 */
const SUporte_ICON_URL =
  "https://media.base44.com/images/public/69540822472c4a70b54d47aa/21fa6b3d5_7917673.png";

const NewFollowUpFAB = memo(({ onClick }) => (
  <button
    onClick={onClick}
    className="fixed bottom-6 right-6 z-40 flex flex-col items-center justify-center gap-0.5 px-2.5 py-2 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all"
    style={{
      backgroundColor: "#ffff99",
      border: "1px solid #e6d7a4",
    }}
    title="Iniciar Suporte"
    aria-label="Iniciar Suporte"
  >
    <img
      src={SUporte_ICON_URL}
      alt=""
      className="w-6 h-6 object-contain"
      style={{ pointerEvents: "none" }}
    />
    <span className="text-xs font-semibold leading-none" style={{ color: "#8B5E3C" }}>
      Suporte
    </span>
  </button>
));

NewFollowUpFAB.displayName = "NewFollowUpFAB";

export default NewFollowUpFAB;