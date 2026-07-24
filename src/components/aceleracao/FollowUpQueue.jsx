import React, { memo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import FollowUpCardV2 from "./FollowUpCardV2";
import OperationSidebar from "./OperationSidebar";

const PAGE_SIZE = 20;

const FollowUpQueue = memo(({ reminders = [], today, onSelectReminder, onLoadMore }) => {
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(reminders.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const startIdx = currentPage * PAGE_SIZE;
  const pageItems = reminders.slice(startIdx, startIdx + PAGE_SIZE);

  const goToPage = (newPage) => {
    const clamped = Math.max(0, Math.min(newPage, totalPages - 1));
    setPage(clamped);
  };

  return (
    <div className="flex gap-4 h-full min-h-0">
      {/* Coluna esquerda — Fila com scroll interno */}
      <div className="flex-1 flex flex-col min-w-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header da fila */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 bg-gray-50">
          <h2 className="text-sm font-bold text-gray-700">
            Fila de Follow-ups
          </h2>
          <span className="text-xs text-gray-400">
            {reminders.length} no total
          </span>
        </div>

        {/* Lista com scroll interno — o container NÃO faz a página scrollar */}
        <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0">
          {pageItems.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center">
              <p className="text-gray-400 text-sm">Nenhum follow-up encontrado</p>
            </div>
          ) : (
            <div>
              {pageItems.map(reminder => (
                <FollowUpCardV2
                  key={reminder.id}
                  reminder={reminder}
                  today={today}
                  onClick={onSelectReminder}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer fixo com paginação */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <span className="text-xs text-gray-400">
            {startIdx + 1}–{Math.min(startIdx + PAGE_SIZE, reminders.length)} de {reminders.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={currentPage === 0}
              onClick={() => goToPage(currentPage - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs font-medium text-gray-600 px-2">
              {currentPage + 1} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={currentPage >= totalPages - 1}
              onClick={() => goToPage(currentPage + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Coluna direita — Sidebar de Inteligência */}
      <OperationSidebar />
    </div>
  );
});

FollowUpQueue.displayName = "FollowUpQueue";

export default FollowUpQueue;