import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Image as ImageIcon, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function LogoUpload({ workshop, onUpdate }) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Apenas imagens são permitidas");
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.Workshop.update(workshop.id, { logo_url: file_url });
      toast.success("Logo atualizado!");
      if (onUpdate) onUpdate({ logo_url: file_url });
    } catch (error) {
      toast.error("Erro ao fazer upload: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    try {
      await base44.entities.Workshop.update(workshop.id, { logo_url: null });
      toast.success("Logo removido!");
      if (onUpdate) onUpdate({ logo_url: null });
    } catch (error) {
      toast.error("Erro: " + error.message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          Logo da Empresa
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {workshop?.logo_url ? (
          <div className="space-y-4">
            <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50 flex items-center justify-center">
              <img 
                src={workshop.logo_url} 
                alt="Logo" 
                className="max-h-32 object-contain"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleRemove} className="flex-1">
                <Trash2 className="w-4 h-4 mr-2" />
                Remover Logo
              </Button>
              <label className="flex-1">
                <Button variant="outline" className="w-full" disabled={uploading} asChild>
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? "Enviando..." : "Alterar Logo"}
                  </span>
                </Button>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleUpload}
                  disabled={uploading}
                />
              </label>
            </div>
          </div>
        ) : (
          <label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600 mb-1">
                {uploading ? "Enviando..." : "Clique para fazer upload do logo"}
              </p>
              <p className="text-xs text-gray-500">PNG, JPG ou SVG (máx. 2MB)</p>
            </div>
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        )}
        <p className="text-xs text-gray-500">
          💡 O logo aparecerá no Regimento Interno e outros documentos oficiais
        </p>
      </CardContent>
    </Card>
  );
}