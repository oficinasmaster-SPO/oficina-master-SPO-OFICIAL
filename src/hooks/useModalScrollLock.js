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
 */
export default function useModalScrollLock(open) {
  useEffect(() => {
    if (!open) return;
    const prevOverflowY = document.documentElement.style.overflowY;
    document.documentElement.style.overflowY = "hidden";
    document.body.classList.add("modal-no-shift");
    return () => {
      document.documentElement.style.overflowY = prevOverflowY;
      document.body.classList.remove("modal-no-shift");
    };
  }, [open]);
}