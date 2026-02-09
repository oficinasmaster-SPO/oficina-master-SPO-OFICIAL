import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";

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

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Manual da Oficina</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Link to={createPageUrl("ManualProcessos")}>
            <Button className="w-full bg-blue-600 hover:bg-blue-700">
              <Download className="w-4 h-4 mr-2" />
              Baixar Manual
            </Button>
          </Link>

          <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-sm text-blue-700">
            <p className="font-semibold mb-1">💡 Dica:</p>
            <p>Gere o manual automaticamente com todos os seus processos, instruções, descrições de cargo e cultura organizacional.</p>
          </div>

          {workshop.company_manual_url && (
            <div className="pt-4 border-t">
              <Label className="text-sm font-medium mb-2 block">Manual Enviado (Upload)</Label>
              <a href={workshop.company_manual_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Baixar Manual Enviado
                </Button>
              </a>
            </div>
          )}

          <div className="pt-4 border-t">
            <Label htmlFor="manual-upload" className="text-sm font-medium">Enviar Manual Personalizado (PDF)</Label>
            <p className="text-xs text-gray-600 mt-1 mb-3">Se preferir usar um manual customizado</p>
            <Input
              id="manual-upload"
              type="file"
              accept=".pdf"
              onChange={(e) => handleUpload('manual', e.target.files[0])}
              disabled={uploading}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Organograma</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Link to={createPageUrl("Organograma")}>
              <Button className="w-full bg-green-600 hover:bg-green-700">
                <Download className="w-4 h-4 mr-2" />
                Organograma Estrutural
              </Button>
            </Link>

            <Link to={createPageUrl("OrganogramaFuncional")}>
              <Button className="w-full bg-purple-600 hover:bg-purple-700">
                <Download className="w-4 h-4 mr-2" />
                Organograma Funcional
              </Button>
            </Link>

            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-sm text-blue-700">
              <p className="font-semibold mb-1">💡 Dica:</p>
              <p>Gere seus organogramas estruturais e funcionais dinamicamente.</p>
            </div>
          </div>

          {workshop.organizational_chart_url && (
            <div className="pt-4 border-t">
              <Label className="text-sm font-medium mb-2 block">Organograma Enviado (Upload)</Label>
              <a href={workshop.organizational_chart_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Baixar Organograma Enviado
                </Button>
              </a>
            </div>
          )}

          <div className="pt-4 border-t">
            <Label htmlFor="orgchart-upload" className="text-sm font-medium">Enviar Organograma Personalizado (Imagem/PDF)</Label>
            <p className="text-xs text-gray-600 mt-1 mb-3">Se preferir usar um organograma customizado</p>
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