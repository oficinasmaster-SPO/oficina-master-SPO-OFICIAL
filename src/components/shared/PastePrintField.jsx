/**
 * PastePrintField — campo dedicado para colar prints (Ctrl+V / ⌘V).
 * Foca a área e captura imagens do clipboard, enviando-as e anexando à tarefa.
 *
 * Props:
 *  - images       : array de midias_anexas com type === "imagem" (para thumbnails)
 *  - onAdd        : (mediaItem) => void   — chamado para cada imagem colada
 *  - onRemove     : (indexNaListaDeImages) => void
 */
import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Clipboard, X, Loader2, ImagePlus } from "lucide-react";
import { toast } from "sonner";

export default function PastePrintField({ images = [], onAdd, onRemove }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const [focused, setFocused] = useState(false);

  const handlePaste = async (e) => {
    const files = [];
    for (const item of e.clipboardData?.items || []) {
      if (item.kind === "file" && item.type?.startsWith("image/")) {
        const f = item.getAsFile();
        if (f) files.push(f);
      }
    }
    if (!files.length) return;
    e.preventDefault();
    setBusy(true);
    try {
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        onAdd({
          type: "imagem",
          url: file_url,
          nome: file.name || `print-${Date.now()}.png`,
          uploaded_at: new Date().toISOString(),
        });
      }
      toast.success(`${files.length} print(s) anexado(s)`);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao anexar print");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div
        ref={ref}
        tabIndex={0}
        role="textbox"
        aria-label="Área para colar print"
        onPaste={handlePaste}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onClick={() => ref.current?.focus()}
        className={`
          flex cursor-text items-center gap-3 rounded-[10px] border-2 border-dashed
          px-4 py-3.5 transition-all
          ${focused
            ? "border-blue-400 bg-blue-50/60 ring-2 ring-blue-500/15"
            : "border-gray-200 bg-gray-50/40 hover:border-gray-300 hover:bg-gray-100/50"}
        `}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white">
          {busy
            ? <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
            : <Clipboard className="h-4 w-4 text-gray-500" />}
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-gray-800 flex items-center gap-1.5">
            <ImagePlus className="h-3.5 w-3.5 text-blue-500" />
            Colar Print
          </p>
          <p className="text-xs text-gray-500">
            Clique aqui e cole um print da área de transferência
            <span className="ml-1 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
              Ctrl+V / ⌘V
            </span>
          </p>
        </div>
      </div>

      {images.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-2">
          {images.map((m, i) => (
            <div key={i} className="group relative">
              <img
                src={m.url}
                alt={m.nome}
                className="h-14 w-14 rounded-lg border border-gray-200 object-cover"
              />
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white opacity-0 shadow transition-opacity group-hover:opacity-100"
                aria-label="Remover print"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}