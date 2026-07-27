import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AnexoPreviewModal from "./AnexoPreviewModal";
import { FileText } from "lucide-react";

export default function PedidoInternoVisualizador({ pedido }) {
  const [previewMedia, setPreviewMedia] = useState(null);
  const medias = pedido?.midias_anexas || [];
  const imagens = medias.filter(m => m.type === "imagem");
  const documentos = medias.filter(m => m.type !== "imagem");

  if (!medias || medias.length === 0) return null;

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-base">Anexos ({medias.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {imagens.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Imagens</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {imagens.map((media, idx) => (
                <button
                  key={idx}
                  onClick={() => setPreviewMedia(media)}
                  className="relative group rounded border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <img
                    src={media.url}
                    alt={media.nome}
                    className="w-full h-32 object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <span className="text-white text-xs font-semibold opacity-0 group-hover:opacity-100">
                      Expandir
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {documentos.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Documentos e Links</h3>
            <div className="space-y-2">
              {documentos.map((media, idx) => (
                <button
                  key={idx}
                  onClick={() => setPreviewMedia(media)}
                  className="flex w-full items-center p-3 bg-gray-50 rounded border border-gray-200 hover:bg-gray-100 transition-colors text-left"
                >
                  <div className="flex-1 truncate">
                    <p className="text-sm font-medium text-primary truncate">
                      {media.nome}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{media.url}</p>
                  </div>
                  <span className="ml-2 text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                    {media.type === "link" ? "Link" : "Arquivo"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      {previewMedia && (
        <AnexoPreviewModal media={previewMedia} onClose={() => setPreviewMedia(null)} />
      )}
    </Card>
  );
}
