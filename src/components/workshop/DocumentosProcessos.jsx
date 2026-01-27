import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { FileText, Upload, Download, Loader2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export default function DocumentosProcessos({ workshop, onUpdate }) {
  const [uploading, setUploading] = useState(false);
  const [generatingMaster, setGeneratingMaster] = useState(false);
  const [generatingNoMaster, setGeneratingNoMaster] = useState(false);

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

  const generateManual = async (includeMaster) => {
    if (!workshop?.id) {
      toast.error("Oficina não encontrada");
      return;
    }

    try {
      includeMaster ? setGeneratingMaster(true) : setGeneratingNoMaster(true);

      console.log('🔵 Iniciando geração do manual:', {
        workshop_id: workshop.id,
        include_master_processes: includeMaster,
        workshop_name: workshop.name
      });

      const response = await base44.functions.invoke('generateWorkshopManualPDF', {
        workshop_id: workshop.id,
        include_master_processes: includeMaster
      });

      console.log('🟢 Resposta da função:', response);

      if (response?.pdfUrl) {
        console.log('🟢 Abrindo URL:', response.pdfUrl);
        window.open(response.pdfUrl, '_blank');
        toast.success(`Manual ${response.cached ? 'recuperado do cache' : 'gerado'} com sucesso!`);
      } else {
        console.error('❌ Sem pdfUrl na resposta:', response);
        toast.error("Erro ao gerar manual: resposta sem URL");
      }
    } catch (error) {
      console.error('❌ Erro ao gerar manual:', error);
      toast.error("Erro: " + (error?.message || error));
    } finally {
      includeMaster ? setGeneratingMaster(false) : setGeneratingNoMaster(false);
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
          <div className="space-y-3">
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="flex-1 bg-blue-600 hover:bg-blue-700">
                    <Download className="w-4 h-4 mr-2" />
                    Baixar Manual
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-80">
                  <div className="p-3 text-sm font-semibold text-gray-700">
                    Manual Gerado Automaticamente
                  </div>
                  <DropdownMenuItem 
                    onClick={() => generateManual(true)}
                    disabled={generatingMaster}
                    className="flex flex-col items-start py-3 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      {generatingMaster && <Loader2 className="w-4 h-4 animate-spin" />}
                      <span className="font-medium">Com Processos Oficinas Master</span>
                    </div>
                    <span className="text-xs text-gray-500 ml-6">Inclui processos padrão da consultoria</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem 
                    onClick={() => generateManual(false)}
                    disabled={generatingNoMaster}
                    className="flex flex-col items-start py-3 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      {generatingNoMaster && <Loader2 className="w-4 h-4 animate-spin" />}
                      <span className="font-medium">Sem Processos Oficinas Master</span>
                    </div>
                    <span className="text-xs text-gray-500 ml-6">Apenas processos da sua oficina</span>
                  </DropdownMenuItem>

                  {workshop.company_manual_url && (
                    <>
                      <DropdownMenuSeparator />
                      <div className="p-3 text-sm font-semibold text-gray-700">
                        Manual Enviado (Upload)
                      </div>
                      <DropdownMenuItem asChild>
                        <a 
                          href={workshop.company_manual_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 cursor-pointer py-3"
                        >
                          <Download className="w-4 h-4" />
                          <span>Baixar Manual Enviado</span>
                        </a>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-sm text-blue-700">
              <p className="font-semibold mb-1">💡 Dica:</p>
              <p>O manual é gerado automaticamente com todos os seus processos, instruções, descrições de cargo e cultura organizacional.</p>
            </div>
          </div>

          <div className="pt-4 border-t">
            <Label htmlFor="manual-upload" className="text-sm font-medium">
              Ou enviar Manual Personalizado (PDF)
            </Label>
            <p className="text-xs text-gray-600 mt-1 mb-3">
              Se preferir usar um manual customizado, upload aqui
            </p>
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