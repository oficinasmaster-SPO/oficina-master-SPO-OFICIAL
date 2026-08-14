import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

/**
 * S4 — Modal de detalhe dos cards da Central Operacional.
 * Mostra a lista de itens (clientes/empresas) contados no card clicado.
 *
 * Props:
 *   open     — boolean
 *   onClose  — callback
 *   title    — título do card (ex: "Empresas atendidas")
 *   emoji    — emoji do card
 *   count    — número total
 *   items    — array de { wid, name } com os itens listados
 *   color    — "red" | "green" | "blue" | "orange" | "purple"
 */

const COLOR_CLASSES = {
  red:    "bg-red-50 text-red-700 border-red-200",
  orange: "bg-orange-50 text-orange-700 border-orange-200",
  green:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
  blue:   "bg-blue-50 text-blue-700 border-blue-200",
};

export default function MetricDetailModal({ open, onClose, title, emoji, count, items = [], color = "blue" }) {
  const colorClass = COLOR_CLASSES[color] || COLOR_CLASSES.blue;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] p-0 overflow-hidden rounded-xl">
        <DialogHeader className={`px-4 py-3 border-b ${colorClass}`}>
          <DialogTitle className="flex items-center gap-2 text-sm font-bold">
            <span className="text-base">{emoji}</span>
            {title}
            <span className="ml-auto text-xs font-bold opacity-70">
              {count} {count === 1 ? 'item' : 'itens'}
            </span>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {items.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">
              Nenhum item nesta categoria.
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {items.map((item, idx) => (
                <div
                  key={item.wid || idx}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-xs font-bold text-gray-300 tabular-nums w-5 text-right">
                    {idx + 1}
                  </span>
                  <span className="text-sm text-gray-800 truncate">
                    {item.name || item.wid || '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
