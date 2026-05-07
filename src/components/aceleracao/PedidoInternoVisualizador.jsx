import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export default function PedidoInternoVisualizador({ pedido }) {
  const [imagemExpandida, setImagemExpandida] = useState(null);
  const medias = pedido?.midias_anexas || [];
  
  if (!medias || medias.length === 0) return null;

  const imagens = medias.filter(m => m.type === 'imagem');
  const documentos = medias.filter(m => m.type !== 'imagem');

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-base">Anexos ({medias.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Imagens em grid */}
        {imagens.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Imagens</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {imagens.map((media, idx) => (
                <button
                  key={idx}
                  onClick={() => setImagemExpandida(media)}
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

        {/* Documentos e Links */}
        {documentos.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Documentos e Links</h3>
            <div className="space-y-2">
              {documentos.map((media, idx) => (
                <a
                  key={idx}
                  href={media.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center p-3 bg-gray-50 rounded border border-gray-200 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1 truncate">
                    <p className="text-sm font-medium text-primary hover:underline truncate">
                      {media.nome}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{media.url}</p>
                  </div>
                  <span className="ml-2 text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                    {media.type === 'link' ? '🔗 Link' : '📄 Arquivo'}
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      {/* Modal de imagem expandida */}
      {imagemExpandida && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setImagemExpandida(null)}>
          <Card className="max-w-2xl max-h-[90vh] overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm truncate">{imagemExpandida.nome}</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setImagemExpandida(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <img
                src={imagemExpandida.url}
                alt={imagemExpandida.nome}
                className="w-full h-auto rounded"
              />
            </CardContent>
          </Card>
        </div>
      )}
    </Card>
  );
}