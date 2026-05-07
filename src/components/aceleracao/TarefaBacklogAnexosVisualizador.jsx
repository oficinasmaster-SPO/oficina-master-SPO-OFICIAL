import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export default function TarefaBacklogAnexosVisualizador({ tarefa }) {
  const [imagemExpandida, setImagemExpandida] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const anexos = tarefa?.anexos || [];
  const imagens = anexos.filter(m => m.type === 'imagem');
  const documentos = anexos.filter(m => m.type !== 'imagem');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!imagemExpandida) return;
      if (e.key === 'ArrowLeft') irParaAnterior();
      if (e.key === 'ArrowRight') irProxima();
      if (e.key === 'Escape') setImagemExpandida(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [imagemExpandida, currentImageIndex]);

  if (!anexos || anexos.length === 0) return null;

  const irProxima = () => {
    if (currentImageIndex < imagens.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
      setImagemExpandida(imagens[currentImageIndex + 1]);
    }
  };

  const irParaAnterior = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
      setImagemExpandida(imagens[currentImageIndex - 1]);
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-base">Anexos ({anexos.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {imagens.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Imagens</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {imagens.map((anexo, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setCurrentImageIndex(idx);
                    setImagemExpandida(anexo);
                  }}
                  className="relative group rounded border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <img
                    src={anexo.url}
                    alt={anexo.nome}
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
              {documentos.map((anexo, idx) => (
                <a
                  key={idx}
                  href={anexo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center p-3 bg-gray-50 rounded border border-gray-200 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1 truncate">
                    <p className="text-sm font-medium text-primary hover:underline truncate">
                      {anexo.nome}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{anexo.url}</p>
                  </div>
                  <span className="ml-2 text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                    {anexo.type === 'link' ? '🔗 Link' : '📄 Arquivo'}
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      {imagemExpandida && imagens.length > 0 && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setImagemExpandida(null)}>
          <div className="relative w-full h-full max-w-4xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="text-white">
                <h3 className="font-semibold truncate max-w-xs">{imagemExpandida.nome}</h3>
                <p className="text-sm text-gray-300">{currentImageIndex + 1} / {imagens.length}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setImagemExpandida(null)}
                className="text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex-1 flex items-center justify-center overflow-auto">
              <img
                src={imagemExpandida.url}
                alt={imagemExpandida.nome}
                className="max-w-full max-h-full object-contain"
              />
            </div>

            {imagens.length > 1 && (
              <div className="flex items-center justify-center gap-4 mt-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={irParaAnterior}
                  disabled={currentImageIndex === 0}
                  className="text-white hover:bg-white/10 disabled:opacity-50"
                >
                  <ChevronLeft className="w-6 h-6" />
                </Button>

                <span className="text-white text-sm font-medium min-w-12 text-center">
                  {currentImageIndex + 1}/{imagens.length}
                </span>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={irProxima}
                  disabled={currentImageIndex === imagens.length - 1}
                  className="text-white hover:bg-white/10 disabled:opacity-50"
                >
                  <ChevronRight className="w-6 h-6" />
                </Button>
              </div>
            )}

            <p className="text-center text-xs text-gray-400 mt-3">
              Use ← → para navegar ou ESC para fechar
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}