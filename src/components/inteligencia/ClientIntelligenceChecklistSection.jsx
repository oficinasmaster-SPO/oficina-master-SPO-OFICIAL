import React, { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, Plus, Edit2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import ClientIntelligenceChecklistManager from "./ClientIntelligenceChecklistManager";

export default function ClientIntelligenceChecklistSection({
  intelligenceId,
  area,
  type,
  workshopId,
  onChecklistUpdated
}) {
  const [checklist, setChecklist] = useState(null);
  const [progress, setProgress] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);

  useEffect(() => {
    if (intelligenceId && area && type && workshopId) {
      loadChecklistAndProgress();
    }
  }, [intelligenceId, area, type, workshopId]);

  const loadChecklistAndProgress = async () => {
    setIsLoading(true);
    try {
      // Buscar checklist padrão para essa área/tipo
      const checklists = await base44.entities.ClientIntelligenceChecklist.filter({
        workshop_id: workshopId,
        area,
        type,
        status: "ativo"
      });

      if (checklists && checklists.length > 0) {
        setChecklist(checklists[0]);

        // Buscar progresso
        const progressData = await base44.entities.ClientIntelligenceChecklistProgress.filter({
          intelligence_id: intelligenceId,
          checklist_id: checklists[0].id
        });

        if (progressData && progressData.length > 0) {
          setProgress(progressData[0]);
        } else {
          // Criar progresso inicial
          const newProgress = await base44.entities.ClientIntelligenceChecklistProgress.create({
            intelligence_id: intelligenceId,
            checklist_id: checklists[0].id,
            workshop_id: workshopId,
            checked_items: checklists[0].items.map(item => ({
              item_id: item.id,
              checked: false,
              notes: ""
            })),
            completion_percentage: 0
          });
          setProgress(newProgress);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar checklist:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleItem = async (itemId) => {
    if (!progress) return;

    try {
      const updatedItems = progress.checked_items.map(item =>
        item.item_id === itemId
          ? { ...item, checked: !item.checked, updated_at: new Date().toISOString() }
          : item
      );

      const completedCount = updatedItems.filter(i => i.checked).length;
      const percentage = Math.round((completedCount / updatedItems.length) * 100);

      await base44.entities.ClientIntelligenceChecklistProgress.update(progress.id, {
        checked_items: updatedItems,
        completion_percentage: percentage
      });

      setProgress({
        ...progress,
        checked_items: updatedItems,
        completion_percentage: percentage
      });

      if (onChecklistUpdated) {
        onChecklistUpdated();
      }
    } catch (error) {
      toast.error("Erro ao atualizar checklist");
      console.error(error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!checklist) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-900 mb-1">Nenhum checklist</p>
          <p className="text-xs text-blue-700">Crie um checklist para ajudar a orientar as ações</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setManagerOpen(true)}
          className="ml-2"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="border-l-4 border-indigo-400 pl-4 py-3">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-600" />
              <h4 className="font-semibold text-gray-900">{checklist.title}</h4>
            </div>
            {checklist.description && (
              <p className="text-xs text-gray-600 mb-3">{checklist.description}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setManagerOpen(true)}
            className="w-8 h-8"
          >
            <Edit2 className="w-4 h-4 text-gray-500" />
          </Button>
        </div>

        {progress && (
          <div className="space-y-2">
            {/* Barra de Progresso */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all"
                  style={{ width: `${progress.completion_percentage}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-gray-600 whitespace-nowrap">
                {progress.completion_percentage}%
              </span>
            </div>

            {/* Items do Checklist */}
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {progress.checked_items.map((item) => {
                const checklistItem = checklist.items.find(
                  ci => ci.id === item.item_id
                );
                return (
                  <label
                    key={item.item_id}
                    className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={item.checked}
                      onChange={() => handleToggleItem(item.item_id)}
                    />
                    <span
                      className={`text-sm ${
                        item.checked
                          ? "text-gray-400 line-through"
                          : "text-gray-700"
                      }`}
                    >
                      {checklistItem?.label || "Item"}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <ClientIntelligenceChecklistManager
        open={managerOpen}
        onOpenChange={setManagerOpen}
        area={area}
        type={type}
        workshopId={workshopId}
        onChecklistCreated={() => {
          setManagerOpen(false);
          loadChecklistAndProgress();
        }}
      />
    </>
  );
}