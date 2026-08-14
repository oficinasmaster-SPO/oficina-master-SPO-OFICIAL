// S1 — Notification Dropdown
// Substitui o <Link> do sininho no Layout por um Popover inline.
// Consome a query ['notifications', userId] já existente no Layout — zero queries novas.
// O NotificationListener continua sincronizando em tempo real sem alteração.

import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, X, CheckCheck, ExternalLink, BellOff } from "lucide-react";
import { createPageUrl } from "@/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

// Ícones por tipo de notificação — espelha o mapa do NotificationListener
const TIPO_ICONE = {
  prazo_proximo:            "⏰",
  prazo_hoje:               "⚠️",
  prazo_semana:             "📅",
  processo_atrasado:        "🔴",
  processo_concluido:       "✅",
  nova_ata:                 "📋",
  meta_batida:              "🎯",
  meta_nacional_empresa:    "🏆",
  meta_nacional_colaborador:"⭐",
  atrasada:                 "🔴",
  status_alterado:          "✅",
  nova_subtarefa:           "🔔",
};

function tempoRelativo(dateStr) {
  if (!dateStr) return "";
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ptBR });
  } catch {
    return "";
  }
}

export default function NotificationDropdown({ notifications = [], userId }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  // QA-FIX: a query do Layout já filtra is_read:false no backend —
  // todos os itens do array são não-lidos, filter redundante removido.
  const unreadCount = notifications.length;

  // ── Marcar uma como lida ──
  const marcarLidaMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { is_read: true }),
    onMutate: async (id) => {
      // Update otimista — remove do array imediatamente
      queryClient.setQueryData(['notifications', userId], (old = []) =>
        old.filter(n => n.id !== id)
      );
      // Sincroniza também a key do NotificationListener
      queryClient.setQueryData(['notifications-unread', userId], (old = []) =>
        old.filter(n => n.id !== id)
      );
    },
    onError: () => toast.error("Erro ao marcar notificação como lida"),
  });

  // ── Marcar todas como lidas ──
  const marcarTodasMutation = useMutation({
    mutationFn: async () => {
      const pendentes = notifications.filter(n => !n.is_read);
      await Promise.all(
        pendentes.map(n => base44.entities.Notification.update(n.id, { is_read: true }))
      );
    },
    onMutate: async () => {
      queryClient.setQueryData(['notifications', userId], []);
      queryClient.setQueryData(['notifications-unread', userId], []);
    },
    onSuccess: () => toast.success("Todas as notificações foram marcadas como lidas"),
    onError: () => toast.error("Erro ao limpar notificações"),
  });

  const handleNavegar = useCallback((link) => {
    setOpen(false);
    if (link) {
      // link_acao pode ser rota relativa ou URL absoluta
      if (link.startsWith("http")) {
        window.location.href = link;
      } else {
        navigate(link);
      }
    }
  }, [navigate]);

  const handleVerTodas = useCallback(() => {
    setOpen(false);
    navigate(createPageUrl("Notificacoes"));
  }, [navigate]);

  // Mostra até 10 no dropdown
  const visiveis = notifications.slice(0, 10);
  const temMais = notifications.length > 10;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          aria-label="Notificações"
        >
          <Bell className="w-5 h-5 text-gray-700" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 bg-red-500 text-white h-5 min-w-5 px-1.5 text-[10px] leading-none flex items-center justify-center pointer-events-none">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[360px] p-0 shadow-xl border border-gray-200 rounded-xl overflow-hidden"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-gray-700" />
            <span className="text-sm font-semibold text-gray-900">Notificações</span>
            {unreadCount > 0 && (
              <Badge className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0 h-4">
                {unreadCount}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => marcarTodasMutation.mutate()}
              disabled={marcarTodasMutation.isPending}
              className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium transition-colors disabled:opacity-50"
              title="Marcar todas como lidas"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Limpar tudo
            </button>
          )}
        </div>

        {/* ── Lista ── */}
        {visiveis.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 bg-gray-50/50">
            <div className="bg-gray-100 rounded-full p-3">
              <BellOff className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">Nenhuma notificação pendente</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[380px]">
            <div className="divide-y divide-gray-50">
              {visiveis.map((n) => {
                const icone = TIPO_ICONE[n.type] || "🔔";
                const isLida = n.is_read;
                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 group transition-colors ${
                      isLida
                        ? "bg-white hover:bg-gray-50"
                        : "bg-red-50/40 hover:bg-red-50/70"
                    }`}
                  >
                    {/* Ícone de tipo */}
                    <span className="text-base mt-0.5 flex-shrink-0 select-none">{icone}</span>

                    {/* Conteúdo — clicável */}
                    <button
                      className="flex-1 text-left min-w-0"
                      onClick={() => handleNavegar(n.link_acao)}
                    >
                      <p className={`text-sm leading-snug truncate ${isLida ? "text-gray-600" : "text-gray-900 font-medium"}`}>
                        {n.title || "Notificação"}
                      </p>
                      {n.message && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
                          {n.message}
                        </p>
                      )}
                      <p className="text-[10px] text-gray-400 mt-1">
                        {tempoRelativo(n.created_date)}
                      </p>
                    </button>

                    {/* Botão marcar como lida */}
                    {!isLida && (
                      <button
                        onClick={(e) => { e.stopPropagation(); marcarLidaMutation.mutate(n.id); }}
                        className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-600"
                        title="Marcar como lida"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Overflow hint */}
              {temMais && (
                <div className="px-4 py-2 bg-gray-50 text-center">
                  <p className="text-xs text-gray-500">
                    +{notifications.length - 10} notificações mais antigas
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {/* ── Footer ── */}
        <div className="border-t border-gray-100 bg-white px-4 py-2.5">
          <button
            onClick={handleVerTodas}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-red-600 hover:text-red-700 font-medium transition-colors py-0.5"
          >
            <ExternalLink className="w-3 h-3" />
            Ver todas as notificações
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
