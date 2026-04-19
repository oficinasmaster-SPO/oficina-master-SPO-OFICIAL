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
  const [linkUrl, setLinkUrl] = useState(task.link_url || "");
  const [uploading, setUploading] = useState(false);

  // Sincronizar estado local quando a task mudar (ex: troca de fase)
  useEffect(() => {
    setEvidenceNote(task.evidence_note || "");
    setLinkUrl(task.link_url || "");
    setShowEvidenceForm(false);
    setShowDetails(false);
  }, [task.evidence_note, task.link_url, task.description]);

  const isDone = task.status === "done";

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    onUpdateEvidence(index, { evidence_url: file_url, evidence_note: evidenceNote, link_url: linkUrl });
    setUploading(false);
    setShowEvidenceForm(false);
  };

  const handleSaveNote = () => {
    onUpdateEvidence(index, { evidence_note: evidenceNote, link_url: linkUrl });
    setShowEvidenceForm(false);
  };

  return (
    <div className={cn(
      "border rounded-lg p-3 transition-colors",
      isDone ? "bg-green-50 border-green-200" : "bg-white border-gray-200"
    )}>
      <div className="flex items-start gap-3">
        <Checkbox
          checked={isDone}
          onCheckedChange={() => canComplete && onToggle(index)}
          disabled={!canComplete}
          className="mt-0.5"
        />
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm", isDone && "line-through text-gray-500")}>
            {task.description}
          </p>

          {/* Descrição/instruções expansível */}
          {task.instructions && (
            <button
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-1"
              onClick={() => setShowDetails(!showDetails)}
            >
              <Info className="w-3 h-3" />
              Como fazer
              {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
          {showDetails && task.instructions && (
            <div className="mt-1 text-xs text-gray-600 bg-blue-50 border border-blue-100 rounded p-2 whitespace-pre-line">
              {task.instructions}
            </div>
          )}

          {/* Link material complementar */}
          {task.link_url && (
            <a
              href={task.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"
            >
              <Link className="w-3 h-3" /> Material complementar
            </a>
          )}

          {/* Who completed */}
          {isDone && task.completed_by_role && (
            <div className="flex items-center gap-1 mt-1">
              <User className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-500">
                Concluída por {task.completed_by_role === "oficina" ? "Oficina" : "Consultor"}
              </span>
            </div>
          )}

          {/* Evidence badge */}
          {task.evidence_url && (
            <a href={task.evidence_url} target="_blank" rel="noopener noreferrer">
              <Badge variant="outline" className="mt-1 text-xs gap-1 text-green-700 border-green-300">
                <Check className="w-3 h-3" /> Evidência anexada
              </Badge>
            </a>
          )}
          {task.evidence_note && !showEvidenceForm && (
            <p className="text-xs text-gray-500 mt-1 italic">"{task.evidence_note}"</p>
          )}

          {/* Evidence form */}
          {showEvidenceForm && (
            <div className="mt-2 space-y-2 bg-gray-50 p-2 rounded">
              <Textarea
                placeholder="Observação sobre esta tarefa..."
                value={evidenceNote}
                onChange={(e) => setEvidenceNote(e.target.value)}
                rows={2}
                className="text-sm"
              />
              <Input
                placeholder="Link de material complementar (ex: https://...)"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                className="text-sm"
              />
              <div className="flex gap-2">
                <label className="cursor-pointer">
                  <Input type="file" className="hidden" onChange={handleFileUpload} accept="image/*,.pdf,.doc,.docx" />
                  <Button type="button" variant="outline" size="sm" disabled={uploading} asChild>
                    <span><Upload className="w-3 h-3 mr-1" />{uploading ? "Enviando..." : "Arquivo"}</span>
                  </Button>
                </label>
                <Button size="sm" variant="outline" onClick={handleSaveNote}>
                  Salvar Nota
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowEvidenceForm(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Add evidence button */}
        {canAddNotes && !showEvidenceForm && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowEvidenceForm(true)}>
            <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
          </Button>
        )}
      </div>
    </div>
  );
}