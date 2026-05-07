import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Upload, X, Link as LinkIcon, Image as ImageIcon, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export default function TarefaBacklogMediaUpload({ anexos = [], onAnexosChange }) {
  const [uploading, setUploading] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const [imagemExpandida, setImagemExpandida] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const dropZoneRef = useRef(null);

  const imagens = anexos.filter(m => m.type === 'imagem');

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

  const handleFileUpload = async (files) => {
    setUploading(true);
    try {
      const novoAnexos = [...anexos];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        novoAnexos.push({
          type: file.type.startsWith('image/') ? 'imagem' : 'arquivo',
          url: file_url,
          nome: file.name,
          uploaded_at: new Date().toISOString()
        });
      }
      onAnexosChange(novoAnexos);
      toast.success(`${files.length} arquivo(s) enviado(s)`);
    } catch (error) {
      toast.error('Erro ao fazer upload');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handlePaste = async (e) => {
    const items = e.clipboardData?.items || [];
    const files = [];
    
    for (let item of items) {
      if (item.kind === 'file') {
        files.push(item.getAsFile());
      }
    }
    
    if (files.length > 0) {
      e.preventDefault();
      handleFileUpload(files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    dropZoneRef.current?.classList.add('border-primary', 'bg-primary/5');
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    dropZoneRef.current?.classList.remove('border-primary', 'bg-primary/5');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    dropZoneRef.current?.classList.remove('border-primary', 'bg-primary/5');
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) handleFileUpload(files);
  };

  const addLink = () => {
    if (!linkInput.trim()) {
      toast.error('Cole um link válido');
      return;
    }
    const novoAnexos = [...anexos, {
      type: 'link',
      url: linkInput,
      nome: linkInput.split('/').pop() || 'Link',
      uploaded_at: new Date().toISOString()
    }];
    onAnexosChange(novoAnexos);
    setLinkInput("");
    toast.success('Link adicionado');
  };

  const removeAnexo = (index) => {
    onAnexosChange(anexos.filter((_, i) => i !== index));
  };

  const getIcon = (type) => {
    switch(type) {
      case 'imagem': return <ImageIcon className="w-4 h-4" />;
      case 'link': return <LinkIcon className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const isImage = (tipo) => tipo === 'imagem';

  return (
    <div className="space-y-4">
      <Label>Anexos (Imagens, Documentos, Links)</Label>
      
      <div
        ref={dropZoneRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onPaste={handlePaste}
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer transition-colors hover:border-primary hover:bg-primary/5"
      >
        <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
        <p className="text-sm text-gray-600 mb-2">
          Arraste arquivos/imagens aqui ou <label className="text-primary cursor-pointer hover:underline">
            clique para selecionar
            <input
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
              onChange={(e) => e.target.files && handleFileUpload(Array.from(e.target.files))}
              className="hidden"
            />
          </label>
        </p>
        <p className="text-xs text-gray-500">Ou copie e cole imagens direto aqui (Ctrl+V / Cmd+V)</p>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Cole um link aqui (ex: https://...)"
          value={linkInput}
          onChange={(e) => setLinkInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addLink()}
        />
        <Button 
          type="button" 
          variant="outline" 
          onClick={addLink}
          disabled={uploading || !linkInput.trim()}
        >
          <LinkIcon className="w-4 h-4 mr-1" />
          Adicionar Link
        </Button>
      </div>

      {anexos.length > 0 && (
        <Card className="p-4">
          <p className="text-sm font-semibold mb-4">
            Anexos ({anexos.length})
          </p>
          
          {imagens.length > 0 && (
            <div className="mb-6">
              <p className="text-xs text-gray-600 mb-2 font-medium">Imagens</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {imagens.map((anexo, idx) => (
                  <div key={idx} className="relative group cursor-pointer" onClick={() => {
                    setCurrentImageIndex(idx);
                    setImagemExpandida(anexo);
                  }}>
                    <img
                      src={anexo.url}
                      alt={anexo.nome}
                      className="w-full h-24 object-cover rounded border border-gray-200 group-hover:opacity-75 transition-opacity"
                    />
                    <div className="absolute inset-0 rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center bg-black/20">
                      <span className="text-white text-xs font-semibold">Expandir</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeAnexo(anexos.indexOf(anexo));
                      }}
                      className="absolute top-1 right-1 bg-red-500 hover:bg-red-700 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {anexos.filter(m => !isImage(m.type)).length > 0 && (
            <div>
              <p className="text-xs text-gray-600 mb-2 font-medium">Documentos e Links</p>
              <div className="space-y-2">
                {anexos.filter(m => !isImage(m.type)).map((anexo, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                    <div className="flex items-center gap-2 min-w-0">
                      {getIcon(anexo.type)}
                      <a
                        href={anexo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline truncate"
                        title={anexo.nome}
                      >
                        {anexo.nome}
                      </a>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAnexo(anexos.indexOf(anexo))}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

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
    </div>
  );
}