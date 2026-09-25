import { useEffect } from "react";

/**
 * Trava o scroll de fundo sem layout shift — mesma solução já validada no
 * NovoPedidoModal, aqui reaproveitada pelos modais Radix.
 *
 * Dois pontos:
 * 1. O scroller real da página é o <html>, então a trava vai nele (o
 *    `overflow: hidden` que o Radix aplica no <body> não segura o fundo).
 * 2. O espaço da barra de rolagem já é reservado permanentemente pelo
 *    `scrollbar-gutter: stable` (index.css). A compensação de largura que o
 *    react-remove-scroll do Radix aplica inline no <body> vira, portanto, um
 *    deslocamento extra — a classe `modal-no-shift` a anula via CSS
 *    `!important` (que vence o estilo inline do Radix).
 *
 * FIX scroll travado (modais aninhados):
 * O ModalLiquidacaoDRE e o modal interno (Pagamento/Recebimento) chamavam este
 * hook ao mesmo tempo. O segundo lock guardava "hidden" como valor anterior e,
 * ao fechar, podia restaurar "hidden" no <html> — a página perdia a rolagem.
 * Agora o lock é contado por referência: o valor original é salvo só no
 * primeiro lock e restaurado só quando o último é liberado.
 */

let lockCount = 0;
let savedOverflowY = "";

function lock() {
  if (lockCount === 0) {
    const atual = document.documentElement.style.overflowY;
    // Nunca guardar "hidden" como estado original (evita perpetuar um travamento antigo)
    savedOverflowY = atual === "hidden" ? "" : atual;
    document.documentElement.style.overflowY = "hidden";
    document.body.classList.add("modal-no-shift");
  }
  lockCount += 1;
}

function unlock() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount > 0) return;

  document.documentElement.style.overflowY = savedOverflowY;
  document.body.classList.remove("modal-no-shift");

  // Rede de segurança: após a animação de saída, se não houver nenhum dialog
  // aberto, remove resíduos que o Radix às vezes deixa no <body> quando o
  // Dialog é desmontado antes de terminar de fechar.
  setTimeout(() => {
    if (lockCount > 0) return;
    if (document.querySelector('[role="dialog"][data-state="open"]')) return;
    if (document.body.style.pointerEvents === "none") document.body.style.pointerEvents = "";
    if (document.documentElement.style.overflowY === "hidden") document.documentElement.style.overflowY = "";
  }, 400);
}

export default function useModalScrollLock(open) {
  useEffect(() => {
    if (!open) return;
    lock();
    return unlock;
  }, [open]);
}
