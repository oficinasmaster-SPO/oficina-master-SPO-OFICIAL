import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Printer, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function VisualizarAtaModal({ ata, onClose }) {
  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    // Implementar geração de PDF posteriormente
    alert("Funcionalidade de download em desenvolvimento");
  };

  if (!ata) return null;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto print:max-w-full">
        <DialogHeader className="print:hidden">
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              ATA de Atendimento - {ata.code}
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" />
                Imprimir
              </Button>
              <Button size="sm" variant="outline" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4 print:py-8">
          <div className="text-center print:mb-8">
            <div className="flex items-center justify-center mb-4">
              <img 
                src="/logo.png" 
                alt="Oficinas Master" 
                className="h-12"
                onError={(e) => e.target.style.display = 'none'}
              />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">GESTÃO DE PROCESSOS</h2>
            <p className="text-lg">IT - Instrução de Trabalho</p>
            <div className="flex items-center justify-between mt-4 text-sm">
              <span><strong>Código:</strong> {ata.code}</span>
              <span><strong>Data/Hora:</strong> {new Date(ata.meeting_date).toLocaleDateString('pt-BR')} / {ata.meeting_time}</span>
              <Badge variant={ata.status === 'finalizada' ? 'success' : 'secondary'}>
                {ata.status === 'finalizada' ? 'Finalizada' : 'Rascunho'}
              </Badge>
            </div>
          </div>

          <div className="border-t-4 border-red-600 pt-4">
            <p className="text-lg">
              <strong>Tipo de Aceleração:</strong> <span className="text-red-600 uppercase">{ata.tipo_aceleracao}</span>
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 border border-gray-300">
            <div className="bg-red-600 text-white p-4 font-bold">PARTICIPANTES</div>
            <div className="bg-red-600 text-white p-4 font-bold">RESPONSÁVEL</div>
            <div className="bg-red-600 text-white p-4 font-bold">PLANO</div>
            
            <div className="p-4">
              {ata.participantes?.map((p, i) => (
                <p key={i} className="mb-1">• {p.name} - {p.role}</p>
              ))}
            </div>
            <div className="p-4">
              <p><strong>{ata.responsavel?.name}</strong></p>
              <p className="text-sm text-gray-600">{ata.responsavel?.role}</p>
            </div>
            <div className="p-4">
              <p>{ata.plano_nome}</p>
            </div>
          </div>

          <Card>
            <CardContent className="pt-6">
              <h3 className="font-bold text-lg mb-3">1. PAUTAS</h3>
              <p className="whitespace-pre-wrap">{ata.pautas || "Não informado"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="font-bold text-lg mb-3">2. OBJETIVOS DO ATENDIMENTO</h3>
              <p className="whitespace-pre-wrap">{ata.objetivos_atendimento || "Não informado"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="font-bold text-lg mb-3">3. OBJETIVOS DO CONSULTOR</h3>
              <p className="whitespace-pre-wrap">{ata.objetivos_consultor || "Não informado"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="font-bold text-lg mb-3">4. PRÓXIMOS PASSOS</h3>
              {ata.proximos_passos?.length > 0 ? (
                <div className="space-y-2">
                  {ata.proximos_passos.map((passo, i) => (
                    <div key={i} className="border-l-4 border-blue-600 pl-3">
                      <p className="font-medium">{passo.descricao}</p>
                      <p className="text-sm text-gray-600">
                        Responsável: {passo.responsavel} | 
                        Prazo: {new Date(passo.prazo).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p>Nenhum próximo passo definido</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="font-bold text-lg mb-3">5. VISÃO GERAL DO PROJETO DE ACELERAÇÃO</h3>
              <p className="whitespace-pre-wrap">{ata.visao_geral_projeto || "Não informado"}</p>
            </CardContent>
          </Card>

          <div className="text-sm text-gray-500 text-center pt-6 border-t print:hidden">
            <p>Gerado por: {ata.created_by}</p>
            <p>Data de criação: {new Date(ata.created_date).toLocaleString('pt-BR')}</p>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t print:hidden">
          <Button onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}