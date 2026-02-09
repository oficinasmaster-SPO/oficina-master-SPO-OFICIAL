import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Upload, Download, CheckCircle2, AlertCircle, Printer, Edit } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function ContratoTrabalho({ employee, onUpdate }) {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [showGenerator, setShowGenerator] = useState(false);
  
  const defaultTemplate = `CONTRATO DE TRABALHO

EMPREGADOR: [Nome da Empresa]
EMPREGADO: ${employee.full_name}, CPF: ${employee.cpf || "___________"}, Cargo: ${employee.position}

CLÁUSULA 1ª - DA FUNÇÃO
O EMPREGADO é contratado para exercer a função de ${employee.position}, devendo cumprir com zelo e lealdade suas atribuições.

CLÁUSULA 2ª - DA REMUNERAÇÃO
O EMPREGADO receberá o salário mensal de R$ ${employee.salary || "_______"}, pago até o 5º dia útil do mês subsequente.

CLÁUSULA 3ª - DO HORÁRIO
A jornada de trabalho será conforme escala definida pela empresa.

E por estarem assim justos e contratados, assinam o presente instrumento.

[Cidade/UF], [Data]

__________________________
Empregador

__________________________
${employee.full_name}
`;

  const [contractText, setContractText] = useState(defaultTemplate);

  const addClause = (title, text) => {
    const newClause = `\nCLÁUSULA ADICIONAL - ${title}\n${text}\n`;
    setContractText(prev => prev + newClause);
  };

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

  const handlePrintContract = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Contrato de Trabalho - ${employee.full_name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; white-space: pre-wrap; }
          </style>
        </head>
        <body>
          ${contractText}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const hasContract = !!employee.work_contract_url;

  return (
    <div className="space-y-6">
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

      {/* Gerador de Contrato */}
      <Card className="shadow-lg border-2 border-blue-200">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Gerador de Contrato Padrão</CardTitle>
              <CardDescription>Edite e imprima o contrato com dados automáticos</CardDescription>
            </div>
            <Button onClick={() => setShowGenerator(true)} variant="outline">
              <Edit className="w-4 h-4 mr-2" />
              Abrir Editor
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Dialog open={showGenerator} onOpenChange={setShowGenerator}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Editor de Contrato</DialogTitle>
          </DialogHeader>
          <div className="flex-1 flex flex-col gap-4">
            <div className="flex gap-2 mb-2">
                <Button size="sm" variant="outline" onClick={() => addClause("CONFIDENCIALIDADE", "O EMPREGADO compromete-se a manter sigilo sobre as informações da empresa.")}>+ Confidencialidade</Button>
                <Button size="sm" variant="outline" onClick={() => addClause("NÃO COMPETIÇÃO", "O EMPREGADO não poderá atuar em empresas concorrentes durante a vigência deste contrato.")}>+ Não Competição</Button>
                <Button size="sm" variant="outline" onClick={() => addClause("USO DE IMAGEM", "Autorizo o uso da minha imagem para fins institucionais.")}>+ Uso de Imagem</Button>
            </div>
            <div className="p-2 bg-blue-50 text-xs text-blue-700 rounded">
              Edite as cláusulas livremente. Use os botões acima para adicionar blocos prontos.
            </div>
            <Textarea 
              value={contractText}
              onChange={(e) => setContractText(e.target.value)}
              className="flex-1 font-mono text-sm p-4"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowGenerator(false)}>Fechar</Button>
              <Button onClick={handlePrintContract}>
                <Printer className="w-4 h-4 mr-2" />
                Imprimir / Salvar PDF
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}