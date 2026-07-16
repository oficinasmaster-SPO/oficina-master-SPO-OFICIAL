import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, ChevronUp, ChevronDown, Plus, ListChecks } from "lucide-react";
import { toast } from "sonner";

export default function TarefaChecklist({ tarefaId, workshopId, user }) {
  const queryClient = useQueryClient();
  const [novoItem, setNovoItem] = useState("");

  const { data: itens = [] } = useQuery({
    queryKey: ["backlog-checklist", tarefaId],
    queryFn: async () => {
      const items = await base44.entities.BacklogChecklistItem.filter(
        { task_id: tarefaId },
        "ordem",
        200
      );
      return items || [];
    },
    enabled: !!tarefaId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["backlog-checklist", tarefaId] });
  };

  // Sync denormalized counts to parent task
  useEffect(() => {
    if (!tarefaId) return;
    const concluidos = itens.filter((i) => i.concluido).length;
    base44.entities.TarefaBacklog.update(tarefaId, {
      checklist_total: itens.length,
      checklist_concluidos: concluidos,
    }).catch(() => {});
  }, [itens, tarefaId]);

  const addItemMutation = useMutation({
    mutationFn: async (titulo) => {
      const maxOrdem = itens.reduce((max, i) => Math.max(max, i.ordem || 0), -1);
      return await base44.entities.BacklogChecklistItem.create({
        task_id: tarefaId,
        workshop_id: workshopId,
        titulo,
        ordem: maxOrdem + 1,
        concluido: false,
      });
    },
    onSuccess: () => {
      setNovoItem("");
      invalidate();
    },
    onError: () => toast.error("Erro ao adicionar item"),
  });

  const toggleItemMutation = useMutation({
    mutationFn: async ({ item, novoConcluido }) => {
      return await base44.entities.BacklogChecklistItem.update(item.id, {
        concluido: novoConcluido,
        completed_by: novoConcluido ? user?.id : null,
        completed_by_name: novoConcluido ? user?.full_name : null,
      });
    },
    onSuccess: async (_, { item, novoConcluido }) => {
      if (novoConcluido) {
        try {
          await base44.functions.invoke("registrarActivityLog", {
            entity_type: "tarefa_backlog",
            entity_id: tarefaId,
            workshop_id: workshopId,
            event_type: "field_changed",
            summary: `Checklist: item "${item.titulo}" concluído`,
            field_changed: "checklist_item",
            new_value: "concluido",
          });
        } catch {}
      }
      invalidate();
    },
    onError: () => toast.error("Erro ao atualizar item"),
  });

  const removeItemMutation = useMutation({
    mutationFn: async (itemId) => {
      return await base44.entities.BacklogChecklistItem.delete(itemId);
    },
    onSuccess: () => invalidate(),
    onError: () => toast.error("Erro ao remover item"),
  });

  const reorderMutation = useMutation({
    mutationFn: async ({ item, direction }) => {
      const sorted = [...itens].sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
      const idx = sorted.findIndex((i) => i.id === item.id);
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sorted.length) return;
      const swapItem = sorted[swapIdx];
      await base44.entities.BacklogChecklistItem.update(item.id, { ordem: swapItem.ordem });
      await base44.entities.BacklogChecklistItem.update(swapItem.id, { ordem: item.ordem });
    },
    onSuccess: () => invalidate(),
    onError: () => toast.error("Erro ao reordenar"),
  });

  const handleAdd = (e) => {
    e.preventDefault();
    const titulo = novoItem.trim();
    if (!titulo) return;
    addItemMutation.mutate(titulo);
  };

  const total = itens.length;
  const concluidos = itens.filter((i) => i.concluido).length;
  const pct = total > 0 ? Math.round((concluidos / total) * 100) : 0;
  const sorted = [...itens].sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

  return (
    <div className="space-y-3">
      {/* Header + Progress bar */}
      <div className="flex items-center gap-3">
        <ListChecks className="w-4 h-4 text-gray-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">Checklist</span>
            <span className="text-xs text-gray-500">
              {concluidos}/{total} ({pct}%)
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Items list */}
      {sorted.map((item, idx) => (
        <div key={item.id} className="flex items-center gap-2 group py-0.5">
          <div className="flex flex-col">
            <button
              onClick={() => reorderMutation.mutate({ item, direction: "up" })}
              disabled={idx === 0 || reorderMutation.isPending}
              className="text-gray-300 hover:text-gray-700 disabled:opacity-20 disabled:cursor-not-allowed"
            >
              <ChevronUp className="w-3 h-3" />
            </button>
            <button
              onClick={() => reorderMutation.mutate({ item, direction: "down" })}
              disabled={idx === sorted.length - 1 || reorderMutation.isPending}
              className="text-gray-300 hover:text-gray-700 disabled:opacity-20 disabled:cursor-not-allowed"
            >
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>
          <Checkbox
            checked={item.concluido || false}
            onCheckedChange={(checked) =>
              toggleItemMutation.mutate({ item, novoConcluido: !!checked })
            }
          />
          <span
            className={`flex-1 text-sm ${
              item.concluido ? "line-through text-gray-400" : "text-gray-700"
            }`}
          >
            {item.titulo}
          </span>
          {item.completed_by_name && (
            <span className="text-[10px] text-gray-400 whitespace-nowrap">
              ✓ {item.completed_by_name}
            </span>
          )}
          <button
            onClick={() => removeItemMutation.mutate(item.id)}
            className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}

      {/* Add new item */}
      <form onSubmit={handleAdd} className="flex gap-2">
        <Input
          value={novoItem}
          onChange={(e) => setNovoItem(e.target.value)}
          placeholder="Adicionar item ao checklist..."
          className="text-sm h-8"
        />
        <Button
          type="submit"
          size="sm"
          variant="outline"
          className="flex-shrink-0 px-2"
          disabled={!novoItem.trim() || addItemMutation.isPending}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}