import React, { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Upload, MessageSquare, Check, User, Link, ChevronDown, ChevronUp, Info } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";

export default function SprintTaskItem({ task, index, canComplete, canAddNotes, userRole, onToggle, onUpdateEvidence }) {
  const [showEvidenceForm, setShowEvidenceForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [evidenceNote, setEvidenceNote] = useState(task.evidence_note || "");
  const [uploading, setUploading] = useState(false);

  // Sincronizar estado local APENAS quando a task em si troca (nova tarefa/fase)
  useEffect(() => {
    setEvidenceNote(task.evidence_note || "");
    setShowEvidenceForm(false);
    setShowDetails(false);
  }, [task.description, index]);

  const isDone = task.status === "done";

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    onUpdateEvidence(index, { evidence_url: file_url, evidence_note: evidenceNote });
    setUploading(false);
    setShowEvidenceForm(false);
  };

  const handleSaveNote = () => {
    onUpdateEvidence(index, { evidence_note: evidenceNote });
    setShowEvidenceForm(false);
  };

  return (
    <div className={cn(
      "border rounded-lg p-3 transition-colors",
      isDone ? "bg-green-50 border-green-200" : "bg-white border-gray-200"
    )}>
      {/* Linha principal: checkbox + titulo + botao */}
      <div className="flex items-start gap-3 mb-2">
        <Checkbox
          checked={isDone}
          onCheckedChange={() => canComplete && onToggle(index)}
          disabled={!canComplete}
          className="mt-0.5"
        />
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-medium", isDone && "line-through text-gray-500")}>
            {task.description}
          </p>
        </div>
        {canAddNotes && !showEvidenceForm && (() => {
          const hasContent = !!(task.evidence_note || task.evidence_url || task.link_url);
          return (
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-7 w-7 relative flex-shrink-0", hasContent && "hover:bg-blue-50")}
              onClick={() => setShowEvidenceForm(true)}
              title={hasContent ? "Há observações nesta tarefa" : "Adicionar observação"}
            >
              <MessageSquare className={cn("w-3.5 h-3.5", hasContent ? "text-blue-500 fill-blue-100" : "text-gray-400")} />
              {hasContent && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full" />
              )}
            </Button>
          );
        })()}
      </div>

      {/* Informações fixas dentro da linha: Como fazer + Evidência + Concluída por */}
      <div className="ml-6 flex flex-wrap items-center gap-3 mb-2 text-xs">
        {/* Como fazer */}
        {task.instructions && (
          <button
            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
            onClick={() => setShowDetails(!showDetails)}
          >
            <Info className="w-3 h-3" />
            Como fazer
            {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}

        {/* Evidência */}
        {task.evidence_url && (
          <a href={task.evidence_url} target="_blank" rel="noopener noreferrer">
            <Badge variant="outline" className="text-xs gap-1 text-green-700 border-green-300">
              <Check className="w-3 h-3" /> Evidência
            </Badge>
          </a>
        )}

        {/* Who completed */}
        {isDone && task.completed_by_role && (
          <div className="flex items-center gap-1">
            <User className="w-3 h-3 text-gray-400" />
            <span className="text-gray-500">
              Concluída por {task.completed_by_role === "oficina" ? "Oficina" : "Consultor"}
            </span>
          </div>
        )}
      </div>

      {/* Expandir instrução */}
      {showDetails && task.instructions && (
        <div className="ml-6 mb-2 text-xs text-gray-600 bg-blue-50 border border-blue-100 rounded p-2 whitespace-pre-line">
          {task.instructions}
        </div>
      )}

      {/* Observação salva */}
      {task.evidence_note && !showEvidenceForm && (
        <div className="ml-6 mb-2 p-2 bg-gray-50 border border-gray-200 rounded">
          <label className="text-xs font-medium text-gray-600 block mb-1">Observação:</label>
          <p className="text-xs text-gray-700 italic">"{task.evidence_note}"</p>
        </div>
      )}

      {/* Formulário de evidence (observação) */}
      {showEvidenceForm && (
        <div className="ml-6 mb-2 space-y-2 bg-gray-50 p-2 rounded">
          <Textarea
            placeholder="Observação sobre esta tarefa..."
            value={evidenceNote}
            onChange={(e) => setEvidenceNote(e.target.value)}
            rows={2}
            className="text-sm"
          />

          <div className="flex gap-2">
            <label className="cursor-pointer">
              <Input type="file" className="hidden" onChange={handleFileUpload} accept="image/*,.pdf,.doc,.docx" />
              <Button type="button" variant="outline" size="sm" disabled={uploading} asChild>
                <span><Upload className="w-3 h-3 mr-1" />{uploading ? "Enviando..." : "Arquivo"}</span>
              </Button>
            </label>
            <Button size="sm" variant="outline" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSaveNote(); }}>
             Salvar Nota
            </Button>
            <Button size="sm" variant="ghost" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowEvidenceForm(false); }}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Link material complementar (abaixo) */}
      {task.link_url && (
        <div className="ml-6 mt-2">
          <a
            href={task.link_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-50 border border-blue-200 text-xs text-blue-700 font-medium hover:bg-blue-100 transition-colors"
          >
            <Link className="w-3 h-3 shrink-0" /> Material complementar
          </a>
        </div>
      )}
    </div>
  );
}