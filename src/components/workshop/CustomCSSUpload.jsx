import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileCode, Trash2, Download } from "lucide-react";
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
      
      toast.success("CSS atualizado! A página será recarregada para aplicar as mudanças...");
      if (onUpdate) onUpdate({ custom_css_url: file_url });
      
      // Forçar reload para garantir que o novo CSS seja carregado e o cache limpo
      setTimeout(() => window.location.reload(), 2000);
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
      toast.success("CSS removido! Recarregando...");
      if (onUpdate) onUpdate({ custom_css_url: null });
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      toast.error("Erro: " + error.message);
    }
  };

  const downloadTemplate = () => {
    const templateContent = `/* 
  MODELO DE PERSONALIZAÇÃO VISUAL (CSS)
  --------------------------------------
  Use este arquivo para alterar as cores e estilos do sistema.
  Os valores de cor usam o formato HSL (Hue, Saturation, Lightness).
  
  Ferramenta para converter cores para HSL: https://www.w3schools.com/colors/colors_converter.asp
*/

:root {
  /* --- CORES PRINCIPAIS (HSL) --- */
  
  /* COR PRIMÁRIA (Botões principais, destaques, links ativos) */
  /* Exemplo: Azul padrão (222.2 47.4% 11.2%) */
  --primary: 222.2 47.4% 11.2%; 
  --primary-foreground: 210 40% 98%; /* Texto dentro do botão primário */

  /* COR SECUNDÁRIA (Botões secundários, fundos alternativos) */
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;

  /* FUNDO E TEXTO GERAL */
  --background: 0 0% 100%; /* Fundo da página (0 0% 100% = Branco) */
  --foreground: 222.2 84% 4.9%; /* Cor do texto principal */

  /* CARTÕES E PAINÉIS */
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;

  /* BORDAS */
  --border: 214.3 31.8% 91.4%;
  --radius: 0.5rem; /* Arredondamento padrão (8px) */
}

/* --- EXEMPLOS DE CUSTOMIZAÇÃO ESPECÍFICA --- */

/* Forçar cor de fundo do menu lateral (se desejar diferente do padrão) */
/*
aside {
  background-color: #1e293b !important;
  color: white !important;
}
*/

/* Customizar Títulos */
/*
h1, .text-3xl {
  color: #1e40af !important; 
}
*/

/* Customizar Botões de Ação (ex: botões azuis para laranjas) */
/*
.bg-blue-600 {
  background-color: #f97316 !important;
}
.hover\\:bg-blue-700:hover {
  background-color: #ea580c !important;
}
*/
`;
    
    const blob = new Blob([templateContent], { type: 'text/css' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo-personalizacao.css';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
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
        <div className="pt-2">
            <Button variant="ghost" size="sm" onClick={downloadTemplate} className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-0 h-auto font-normal">
                <Download className="w-3 h-3 mr-1" />
                Baixar modelo de exemplo (.css)
            </Button>
        </div>
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