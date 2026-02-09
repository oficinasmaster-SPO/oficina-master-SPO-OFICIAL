import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Upload, Link as LinkIcon, Trash2, FileText, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

export default function MediaUploadField({ midias, onChange }) {
  const [uploading, setUploading] = useState(false);

  // Carregar documentos do repositório
  const { data: documentos } = useQuery({
    queryKey: ['documentos-repositorio'],
    queryFn: async () => {
      const docs = await base44.entities.CompanyDocument.list();
      return docs.filter(d => d.is_external_use); // Apenas documentos para uso externo
    }
  });

  const addMidiaLink = () => {
    onChange([...midias, { tipo: "link", url: "", titulo: "" }]);
  };

  const addMidiaFromRepo = (docId) => {
    const doc = documentos?.find(d => d.id === docId);
    if (doc && !midias.find(m => m.document_id === docId)) {
      onChange([...midias, {
        tipo: doc.file_type?.includes('image') ? "imagem" : doc.file_type?.includes('video') ? "video" : "documento",
        url: doc.file_url,
        titulo: doc.title,
        document_id: doc.id
      }]);
    }
  };

  const handleFileUpload = async (e, tipo) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange([...midias, {
        tipo,
        url: file_url,
        titulo: file.name
      }]);
      toast.success("Arquivo enviado!");
    } catch (error) {
      toast.error("Erro ao enviar: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const removeMidia = (index) => {
    onChange(midias.filter((_, i) => i !== index));
  };

  const updateMidia = (index, field, value) => {
    const updated = [...midias];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Button type="button" size="sm" variant="outline" onClick={addMidiaLink}>
          <LinkIcon className="w-4 h-4 mr-2" />
          Link
        </Button>
        
        <Button type="button" size="sm" variant="outline" disabled={uploading} asChild>
          <label>
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? "Enviando..." : "Imagem"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileUpload(e, "imagem")}
              disabled={uploading}
            />
          </label>
        </Button>

        <Button type="button" size="sm" variant="outline" disabled={uploading} asChild>
          <label>
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? "Enviando..." : "Vídeo"}
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => handleFileUpload(e, "video")}
              disabled={uploading}
            />
          </label>
        </Button>

        {documentos && documentos.length > 0 && (
          <Select onValueChange={addMidiaFromRepo}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Do repositório..." />
            </SelectTrigger>
            <SelectContent>
              {documentos.map(doc => (
                <SelectItem key={doc.id} value={doc.id}>
                  {doc.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {uploading && (
        <div className="flex items-center gap-2 text-blue-600 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Enviando arquivo...
        </div>
      )}

      {midias.length > 0 && (
        <div className="space-y-2">
          {midias.map((midia, idx) => (
            <Card key={idx} className="p-3">
              <div className="flex gap-3 items-start">
                <Select
                  value={midia.tipo}
                  onValueChange={(value) => updateMidia(idx, 'tipo', value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="link">Link</SelectItem>
                    <SelectItem value="imagem">Imagem</SelectItem>
                    <SelectItem value="video">Vídeo</SelectItem>
                    <SelectItem value="documento">Documento</SelectItem>
                  </SelectContent>
                </Select>
                
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="Título"
                    value={midia.titulo}
                    onChange={(e) => updateMidia(idx, 'titulo', e.target.value)}
                  />
                  <Input
                    placeholder="URL"
                    value={midia.url}
                    onChange={(e) => updateMidia(idx, 'url', e.target.value)}
                    disabled={midia.document_id}
                  />
                </div>
                
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeMidia(idx)}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}