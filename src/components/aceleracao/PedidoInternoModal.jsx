import React from "react";
import { X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import useModalScrollLock from "@/hooks/useModalScrollLock";

export default function PedidoInternoModal({ open, onClose, children, size = "default" }) {
  useModalScrollLock(open);
  const sizeClass = size === "wide"
    ? "max-w-6xl h-[90vh]"
    : "max-w-3xl max-h-[92dvh]";

  // LOTE 2 — integração com o preview de anexos: o FileViewerDrawer é
  // portalizado em document.body (fora da árvore do DialogContent), então
  // interações dentro dele chegam ao Radix como "outside" e fechariam o
  // Dialog do pedido. O drawer é marcado com [data-attachment-preview];
  // eventos cujo alvo está dentro dele são ignorados — o fechamento do
  // preview é responsabilidade exclusiva do próprio drawer.
  const isInsideAttachmentPreview = (event) => {
    const target = event?.target;
    return !!(target && typeof target.closest === "function" && target.closest("[data-attachment-preview]"));
  };
  const guardAttachmentPreview = (e) => {
    if (isInsideAttachmentPreview(e)) e.preventDefault();
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        hideClose
        onOpenAutoFocus={(e) => e.preventDefault()}
        onPointerDownOutside={guardAttachmentPreview}
        onFocusOutside={guardAttachmentPreview}
        onInteractOutside={guardAttachmentPreview}
        className={`flex w-[calc(100vw-1rem)] ${sizeClass} flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:w-[calc(100vw-2rem)]`}>
        <DialogTitle className="sr-only">Pedido interno</DialogTitle>
        <DialogClose className="absolute right-4 top-4 z-10 rounded-lg p-2 text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-ring">
          <X className="h-4 w-4" /><span className="sr-only">Fechar</span>
        </DialogClose>
        {children}
      </DialogContent>
    </Dialog>
  );
}