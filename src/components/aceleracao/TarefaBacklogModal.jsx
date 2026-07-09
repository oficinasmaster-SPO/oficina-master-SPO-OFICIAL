import React from "react";
import { X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";

export default function TarefaBacklogModal({ open, onClose, children }) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        hideClose
        className="flex max-h-[92dvh] w-[calc(100vw-1rem)] max-w-none flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:w-[calc(100vw-2rem)] xl:w-[85vw] xl:min-w-[1100px] xl:max-w-[1400px]"
      >
        <DialogTitle className="sr-only">Detalhes da tarefa</DialogTitle>
        <DialogClose className="absolute right-4 top-4 z-10 rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-ring">
          <X className="h-4 w-4" />
          <span className="sr-only">Fechar</span>
        </DialogClose>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-smooth p-4 sm:p-6">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}