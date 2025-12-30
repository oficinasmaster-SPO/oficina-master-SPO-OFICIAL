import React, { useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Save, Clock } from "lucide-react";

const DRAFT_KEY = 'report_draft_';

export function useDraftManager(workshopId, formData, setFormData) {
  const draftKey = `${DRAFT_KEY}${workshopId}`;

  // Salvar rascunho automaticamente
  const saveDraft = useCallback(() => {
    try {
      const draft = {
        data: formData,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem(draftKey, JSON.stringify(draft));
      return true;
    } catch (error) {
      console.error("Erro ao salvar rascunho:", error);
      return false;
    }
  }, [draftKey, formData]);

  // Carregar rascunho
  const loadDraft = useCallback(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const draft = JSON.parse(saved);
        return draft;
      }
    } catch (error) {
      console.error("Erro ao carregar rascunho:", error);
    }
    return null;
  }, [draftKey]);

  // Limpar rascunho
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(draftKey);
    } catch (error) {
      console.error("Erro ao limpar rascunho:", error);
    }
  }, [draftKey]);

  // Auto-save a cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      if (formData.empresa || formData.objetivo_consultoria) {
        saveDraft();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [formData, saveDraft]);

  // Verificar rascunho ao abrir
  useEffect(() => {
    const draft = loadDraft();
    if (draft && draft.data) {
      const savedTime = new Date(draft.savedAt);
      const now = new Date();
      const hoursDiff = (now - savedTime) / (1000 * 60 * 60);

      // Se o rascunho tem menos de 24h, perguntar se quer restaurar
      if (hoursDiff < 24) {
        const confirmRestore = window.confirm(
          `Encontramos um rascunho salvo em ${savedTime.toLocaleString('pt-BR')}. Deseja restaurar?`
        );
        if (confirmRestore) {
          setFormData(prev => ({ ...prev, ...draft.data }));
          toast.success("Rascunho restaurado!");
        } else {
          clearDraft();
        }
      } else {
        // Rascunho muito antigo, limpar
        clearDraft();
      }
    }
  }, []);

  return { saveDraft, loadDraft, clearDraft };
}

export function DraftIndicator({ workshopId }) {
  const draftKey = `${DRAFT_KEY}${workshopId}`;
  const [lastSaved, setLastSaved] = React.useState(null);

  useEffect(() => {
    const checkDraft = () => {
      try {
        const saved = localStorage.getItem(draftKey);
        if (saved) {
          const draft = JSON.parse(saved);
          setLastSaved(new Date(draft.savedAt));
        }
      } catch {
        setLastSaved(null);
      }
    };

    checkDraft();
    const interval = setInterval(checkDraft, 5000);
    return () => clearInterval(interval);
  }, [draftKey]);

  if (!lastSaved) return null;

  const formatTime = (date) => {
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return 'agora mesmo';
    if (diff < 3600) return `${Math.floor(diff/60)} min atrás`;
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex items-center gap-1 text-xs text-gray-500">
      <Save className="w-3 h-3" />
      <span>Salvo {formatTime(lastSaved)}</span>
    </div>
  );
}