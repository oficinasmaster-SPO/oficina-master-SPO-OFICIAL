import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Paperclip, Link2, Trash2, Upload, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const TIPO_OPTIONS = ["print", "pdf", "video", "audio", "documento", "link"];

export default function EvidenciasUploader({ evidencias, onChange }) {
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const [linkDesc, setLinkDesc] = useState("");
  const [showLinkForm, setShowLinkForm] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const ext = file.name.split(".").pop().toLowerCase();
    const tipo = ["pdf"].includes(ext) ? "pdf"
      : ["mp4","mov","webm"].includes(ext) ? "video"
      : ["mp3","ogg","wav"].includes(ext) ? "audio"
      : "print";
    onChange([...evidencias, {
      tipo,
      arquivo_url: file_url,
      descricao: file.name,
      enviado_por: "consultor",
      created_at: new Date().toISOString(),
    }]);
    setUploading(false);
    e.target.value = "";
  };

  const handleAddLink = () => {
    if (!linkInput.trim()) return;
    onChange([...evidencias, {
      tipo: "link",
      arquivo_url: linkInput.trim(),
      descricao: linkDesc.trim() || linkInput.trim(),
      enviado_por: "consultor",
      created_at: new Date().toISOString(),
    }]);
    setLinkInput("");
    setLinkDesc("");
    setShowLinkForm(false);
  };

  const handleRemove = (idx) => {
    onChange(evidencias.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-4">
      {/* Botões de ação */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="text-xs gap-1.5"
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          {uploading ? "Enviando..." : "Anexar arquivo"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowLinkForm(!showLinkForm)}
          className="text-xs gap-1.5"
        >
          <Link2 className="w-3.5 h-3.5" /> Adicionar link
        </Button>
        <input ref={fileRef} type="file" className="hidden" onChange={handleFileUpload} />
      </div>

      {/* Form de link */}
      {showLinkForm && (
        <div className="border border-gray-200 rounded-xl p-3 space-y-2 bg-gray-50">
          <input
            type="url"
            value={linkInput}
            onChange={e => setLinkInput(e.target.value)}
            placeholder="https://..."
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input
            type="text"
            value={linkDesc}
            onChange={e => setLinkDesc(e.target.value)}
            placeholder="Descrição (opcional)"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <Button size="sm" onClick={handleAddLink} className="text-xs bg-blue-600 hover:bg-blue-700 text-white">
            Adicionar
          </Button>
        </div>
      )}

      {/* Lista de evidências */}
      {evidencias.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl text-gray-400">
          <Paperclip className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhuma evidência ainda</p>
          <p className="text-xs mt-1">Anexe arquivos ou links como comprovação</p>
        </div>
      ) : (
        <div className="space-y-2">
          {evidencias.map((ev, idx) => (
            <div key={idx} className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
              <Paperclip className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 truncate">{ev.descricao || ev.arquivo_url}</p>
                <span className="text-xs text-gray-400 capitalize">{ev.tipo}</span>
              </div>
              {ev.arquivo_url && (
                <a href={ev.arquivo_url} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700">
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
              <button onClick={() => handleRemove(idx)} className="text-gray-300 hover:text-red-500 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}