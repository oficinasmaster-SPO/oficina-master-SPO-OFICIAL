import React, { memo } from "react";
import { LifeBuoy } from "lucide-react";

/**
 * FAB "Suporte" — abre o fluxo de Suporte Rápido (follow-up ad-hoc rastreável).
 * Estilo: pílula amarelo-pálido com ícone LifeBuoy magenta (referência print 2).
 */
const NewFollowUpFAB = memo(({ onClick }) => (
  <button
    onClick={onClick}
    className="fixed bottom-6 right-6 z-40 flex items-center gap-2 pl-2.5 pr-4 py-2.5 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all"
    style={{
      backgroundColor: "#fffef0",
      border: "1px solid #e6d7a4",
    }}
    title="Iniciar Suporte"
    aria-label="Iniciar Suporte"
  >
    <LifeBuoy className="w-5 h-5" style={{ color: "#d94d76" }} />
    <span className="text-sm font-semibold" style={{ color: "#a36136" }}>
      Suporte
    </span>
  </button>
));

NewFollowUpFAB.displayName = "NewFollowUpFAB";

export default NewFollowUpFAB;