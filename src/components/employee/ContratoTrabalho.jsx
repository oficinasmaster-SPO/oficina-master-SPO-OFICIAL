import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Upload, Download, CheckCircle2, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function ContratoTrabalho({ employee, onUpdate }) {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);

  const handleUpload = async () => {
    if (!file) {
      toast.error("Selecione um arquivo");
      return;
    }

    setUploading(true);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await onUpdate({ work_contract_url: file_url });
      
      setFile(null);
      toast.success("Contrato enviado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao fazer upload");
    } finally {
      setUploading(false);
    }
  };

  const hasContract = !!employee.work_contract_url;

  return (
    <Card className={`shadow-lg border-2 ${hasContract ? 'border-green-200' : 'border-orange-200'}`}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 ${hasContract ? 'bg-green-100' : 'bg-orange-100'} rounded-lg flex items-center justify-center`}>
            <FileText className={`w-6 h-6 ${hasContract ? 'text-green-600' : 'text-orange-600'}`} />
          </div>
          <div>
            <CardTitle>Contrato de Trabalho</CardTitle>
            <CardDescription>
              {hasContract ? "Contrato registrado no sistema" : "Nenhum contrato anexado"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {hasContract ? (
          <div className="space-y-4">
            <div className="bg-green-50 rounded-lg p-4 border border-green-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-semibold text-sm text-green-900">Contrato Anexado</p>
                  <p className="text-xs text-green-700">Clique para visualizar</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(employee.work_contract_url, '_blank')}
              >
                <Download className="w-4 h-4 mr-2" />
                Baixar
              </Button>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-gray-600 mb-3">Atualizar contrato:</p>
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setFile(e.target.files[0])}
                  className="flex-1"
                />
                <Button onClick={handleUpload} disabled={uploading || !file}>
                  {uploading ? "Enviando..." : "Atualizar"}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <p className="text-sm text-orange-900">
                Nenhum contrato de trabalho foi anexado para este colaborador
              </p>
            </div>

            <div>
              <Label>Anexar Contrato de Trabalho</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setFile(e.target.files[0])}
                  className="flex-1"
                />
                <Button onClick={handleUpload} disabled={uploading || !file}>
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? "Enviando..." : "Enviar"}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Formatos aceitos: PDF, DOC, DOCX
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}