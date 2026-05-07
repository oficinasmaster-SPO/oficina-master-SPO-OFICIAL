import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Upload, X, Link as LinkIcon, Image as ImageIcon, FileText } from "lucide-react";
import { toast } from "sonner";

export default function PedidoInternoMediaUpload({ medias = [], onMediasChange }) {
  const [uploading, setUploading] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const dropZoneRef = useRef(null);

  const handleFileUpload = async (files) => {
    setUploading(true);
    try {
      const newMedias = [...medias];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        newMedias.push({
          type: file.type.startsWith('image/') ? 'imagem' : 'arquivo',
          url: file_url,
          nome: file.name,
          uploaded_at: new Date().toISOString()
        });
      }
      onMediasChange(newMedias);
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
    const newMedias = [...medias, {
      type: 'link',
      url: linkInput,
      nome: linkInput.split('/').pop() || 'Link',
      uploaded_at: new Date().toISOString()
    }];
    onMediasChange(newMedias);
    setLinkInput("");
    toast.success('Link adicionado');
  };

  const removeMedia = (index) => {
    onMediasChange(medias.filter((_, i) => i !== index));
  };

  const getIcon = (type) => {
    switch(type) {
      case 'imagem': return <ImageIcon className="w-4 h-4" />;
      case 'link': return <LinkIcon className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-4">
      <Label>Anexos e Links (Imagens, Documentos, Links)</Label>
      
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
        <p className="text-xs text-gray-500">Ou copie e cole imagens diretamente aqui</p>
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

      {medias.length > 0 && (
        <Card className="p-4">
          <p className="text-sm font-semibold mb-3">
            Anexos ({medias.length})
          </p>
          <div className="space-y-2">
            {medias.map((media, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                <div className="flex items-center gap-2 min-w-0">
                  {getIcon(media.type)}
                  <a
                    href={media.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline truncate"
                    title={media.nome}
                  >
                    {media.nome}
                  </a>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeMedia(idx)}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}