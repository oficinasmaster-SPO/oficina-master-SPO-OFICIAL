import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { FileText, Upload, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import ManualDownloadButton from "./ManualDownloadButton";

export default function DocumentosProcessos({ workshop, onUpdate }) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (type, file) => {
    if (!file) return;

    try {
      setUploading(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const updateData = {
        [type === 'manual' ? 'company_manual_url' : 
         type === 'orgchart' ? 'organizational_chart_url' : 'logo_url']: file_url
      };

      await onUpdate(updateData);
      toast.success("Arquivo enviado!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao enviar arquivo");
    } finally {
      setUploading(false);
    }
  };

  if (!workshop) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-500">Carregando dados...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Logo da Oficina</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {workshop.logo_url ? (
            <div className="space-y-3">
              <img src={workshop.logo_url} alt="Logo" className="max-h-32 rounded-lg border" />
              <a href={workshop.logo_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Baixar Logo
                </Button>
              </a>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Nenhum logo cadastrado</p>
          )}
          <div>
            <Label htmlFor="logo-upload">Enviar Novo Logo</Label>
            <Input
              id="logo-upload"
              type="file"
              accept="image/*"
              onChange={(e) => handleUpload('logo', e.target.files[0])}
              disabled={uploading}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Manual da Oficina
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Gere automaticamente o manual da sua oficina baseado nos processos cadastrados.
          </p>
          <ManualDownloadButton workshopId={workshop.id} />
          <p className="text-xs text-gray-500 italic">
            💡 O manual é gerado dinamicamente com base em seus processos. Use o dropdown para escolher incluir ou não os processos das Oficinas Master.
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Organograma</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {workshop.organizational_chart_url ? (
            <a href={workshop.organizational_chart_url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Baixar Organograma
              </Button>
            </a>
          ) : (
            <p className="text-sm text-gray-500">Nenhum organograma cadastrado</p>
          )}
          <div>
            <Label htmlFor="orgchart-upload">Enviar Organograma (Imagem/PDF)</Label>
            <Input
              id="orgchart-upload"
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => handleUpload('orgchart', e.target.files[0])}
              disabled={uploading}
            />
          </div>
        </CardContent>
      </Card>

      {uploading && (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="ml-2 text-sm text-gray-600">Enviando arquivo...</span>
        </div>
      )}
    </div>
  );
}