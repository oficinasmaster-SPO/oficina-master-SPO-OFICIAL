import React from "react";
import { X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";

export default function PedidoInternoModal({ open, onClose, children }) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent hideClose className="flex max-h-[92dvh] w-[calc(100vw-1rem)] max-w-3xl flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:w-[calc(100vw-2rem)]">
        <DialogTitle className="sr-only">Pedido interno</DialogTitle>
        <DialogClose className="absolute right-4 top-4 z-10 rounded-lg p-2 text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-ring">
          <X className="h-4 w-4" /><span className="sr-only">Fechar</span>
        </DialogClose>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">{children}</div>
      </DialogContent>
    </Dialog>
  );
}