import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileCode, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function CustomCSSUpload({ workshop, onUpdate }) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.css') && file.type !== 'text/css') {
      toast.error("Apenas arquivos CSS são permitidos");
      return;
    }

    setUploading(true);
    try {
      // Usando o mesmo endpoint de upload de arquivo genérico
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.Workshop.update(workshop.id, { custom_css_url: file_url });
      
      toast.success("CSS personalizado atualizado! Recarregue a página para ver as alterações.");
      if (onUpdate) onUpdate({ custom_css_url: file_url });
    } catch (error) {
      console.error(error);
      toast.error("Erro ao fazer upload: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    try {
      await base44.entities.Workshop.update(workshop.id, { custom_css_url: null });
      toast.success("CSS personalizado removido! Recarregue a página.");
      if (onUpdate) onUpdate({ custom_css_url: null });
    } catch (error) {
      toast.error("Erro: " + error.message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCode className="w-5 h-5" />
          Personalização Visual (CSS)
        </CardTitle>
        <CardDescription>
          Faça upload de um arquivo CSS para personalizar cores, fontes e estilos do sistema.
          Isso afetará apenas a visualização da sua oficina.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {workshop?.custom_css_url ? (
          <div className="space-y-4">
            <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50 flex flex-col items-center justify-center text-center">
              <FileCode className="w-12 h-12 text-blue-500 mb-2" />
              <p className="text-sm font-medium text-gray-900">Arquivo CSS Ativo</p>
              <a 
                href={workshop.custom_css_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline mt-1"
              >
                Visualizar arquivo atual
              </a>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleRemove} className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50">
                <Trash2 className="w-4 h-4 mr-2" />
                Remover Personalização
              </Button>
              <label className="flex-1">
                <Button variant="outline" className="w-full" disabled={uploading} asChild>
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? "Enviando..." : "Substituir Arquivo"}
                  </span>
                </Button>
                <input 
                  type="file" 
                  accept=".css,text/css" 
                  className="hidden" 
                  onChange={handleUpload}
                  disabled={uploading}
                />
              </label>
            </div>
            <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200">
                <p className="text-xs text-yellow-800">
                    ⚠️ <strong>Atenção:</strong> Alterações incorretas no CSS podem quebrar o layout visual. 
                    Se algo der errado, remova o arquivo aqui.
                </p>
            </div>
          </div>
        ) : (
          <label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer">
              <FileCode className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600 mb-1">
                {uploading ? "Enviando..." : "Clique para fazer upload do arquivo CSS"}
              </p>
              <p className="text-xs text-gray-500">Apenas arquivos .css (máx. 2MB)</p>
            </div>
            <input 
              type="file" 
              accept=".css,text/css" 
              className="hidden" 
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        )}
      </CardContent>
    </Card>
  );
}