import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  X, ZoomIn, ZoomOut, RotateCw, Download, ExternalLink,
  FileText, Film, Image as ImageIcon,
} from "lucide-react";

const EXT_MAP = {
  pdf: "pdf", PDF: "pdf",
  mp4: "video", webm: "video", mov: "video", avi: "video",
  jpg: "imagem", jpeg: "imagem", png: "imagem", gif: "imagem", webp: "imagem", svg: "imagem",
};

function detectType(media) {
  if (media.type === "imagem") return "imagem";
  if (media.type === "link") return "link";
  const ext = media.url?.split(".").pop()?.split("?")[0]?.toLowerCase();
  return EXT_MAP[ext] || "outro";
}

export default function AnexoPreviewModal({ media, onClose }) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const tipo = detectType(media);

  const zoomIn = () => setZoom(z => Math.min(z + 0.25, 3));
  const zoomOut = () => setZoom(z => Math.max(z - 0.25, 0.5));
  const rotate = () => setRotation(r => (r + 90) % 360);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <div
        className="relative flex h-full max-h-[90vh] w-full max-w-5xl flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white min-w-0">
            {tipo === "imagem" && <ImageIcon className="h-4 w-4 shrink-0" />}
            {tipo === "pdf" && <FileText className="h-4 w-4 shrink-0" />}
            {tipo === "video" && <Film className="h-4 w-4 shrink-0" />}
            <h3 className="text-sm font-semibold truncate">{media.nome}</h3>
          </div>

          <div className="flex items-center gap-1">
            {tipo === "imagem" && (
              <>
                <Button variant="ghost" size="icon" onClick={zoomOut} className="text-white hover:bg-white/10 h-8 w-8">
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-xs text-gray-400 w-10 text-center">{Math.round(zoom * 100)}%</span>
                <Button variant="ghost" size="icon" onClick={zoomIn} className="text-white hover:bg-white/10 h-8 w-8">
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={rotate} className="text-white hover:bg-white/10 h-8 w-8">
                  <RotateCw className="h-4 w-4" />
                </Button>
              </>
            )}
            <a
              href={media.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-8 w-8 items-center justify-center rounded text-white hover:bg-white/10"
              title="Abrir em nova aba"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
            <a
              href={media.url}
              download={media.nome}
              className="flex h-8 w-8 items-center justify-center rounded text-white hover:bg-white/10"
              title="Baixar"
            >
              <Download className="h-4 w-4" />
            </a>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/10 h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center overflow-auto rounded-lg bg-black/50">
          {tipo === "imagem" && (
            <img
              src={media.url}
              alt={media.nome}
              className="max-w-full max-h-full object-contain transition-transform duration-200"
              style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
            />
          )}

          {tipo === "pdf" && (
            <iframe
              src={media.url}
              title={media.nome}
              className="h-full w-full rounded-lg"
              style={{ minHeight: "70vh" }}
            />
          )}

          {tipo === "video" && (
            <video
              src={media.url}
              controls
              className="max-h-full max-w-full rounded-lg"
              style={{ maxHeight: "75vh" }}
            >
              Seu navegador não suporta vídeo.
            </video>
          )}

          {tipo === "link" && (
            <div className="flex flex-col items-center gap-4 text-center text-white p-8">
              <ExternalLink className="h-12 w-12 text-gray-400" />
              <p className="text-sm">Link externo</p>
              <a
                href={media.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline text-sm break-all"
              >
                {media.url}
              </a>
            </div>
          )}

          {tipo === "outro" && (
            <div className="flex flex-col items-center gap-4 text-center text-white p-8">
              <FileText className="h-12 w-12 text-gray-400" />
              <p className="text-sm font-medium">{media.nome}</p>
              <p className="text-xs text-gray-400">
                Pré-visualização não disponível para este tipo de arquivo.
              </p>
              <a
                href={media.url}
                download={media.nome}
                className="mt-2 inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 transition-colors"
              >
                <Download className="h-4 w-4" />
                Baixar arquivo
              </a>
            </div>
          )}
        </div>

        <p className="mt-2 text-center text-xs text-gray-500">
          Pressione ESC para fechar
        </p>
      </div>
    </div>
  );
}