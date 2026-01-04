import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Printer, Download } from "lucide-react";
import { format } from "date-fns";

export default function RegimentViewer({ regiment, onClose }) {
  const handlePrint = () => {
    window.print();
  };

  const sections = [
    { title: "Identificação", data: regiment.identification },
    { title: "Objetivo", data: regiment.objective },
    { title: "Jornada de Trabalho", data: regiment.work_schedule },
    { title: "Conduta Profissional", data: regiment.professional_conduct },
    { title: "Uso de Celular e Internet", data: regiment.phone_internet_usage },
    { title: "Uniforme, EPI e Segurança", data: regiment.uniform_epi_safety },
    { title: "Patrimônio e Ferramentas", data: regiment.assets_tools_inventory },
    { title: "Confidencialidade", data: regiment.confidentiality },
    { title: "Hierarquia", data: regiment.hierarchy_orders },
    { title: "Treinamentos", data: regiment.training_development },
    { title: "Procedimentos Disciplinares", data: regiment.disciplinary_procedures },
    { title: "Texto Legal para Advertências", data: regiment.warning_legal_text },
    { title: "Texto de Ciência", data: regiment.acknowledgment_text },
    { title: "Disposições Finais", data: regiment.final_provisions }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-4 print:max-w-full">
      <Card className="border-2 border-blue-200 print:hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={onClose}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <CardTitle>Visualização do Regimento</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">Versão {regiment.version}</Badge>
                  {regiment.status === 'active' && (
                    <Badge className="bg-green-600 text-white">Ativo</Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" />
                Imprimir
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className="print-container">
        <CardContent className="p-8 space-y-6">
          {/* Cabeçalho Oficial */}
          <div className="text-center border-b-2 border-gray-900 pb-4 mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              REGIMENTO INTERNO
            </h1>
            <h2 className="text-xl font-semibold text-gray-800">
              {regiment.identification?.company_name}
            </h2>
            <p className="text-sm text-gray-600 mt-2">
              CNPJ: {regiment.identification?.cnpj} | {regiment.identification?.address}
            </p>
            <div className="flex items-center justify-center gap-4 mt-3 text-sm">
              <span>Versão: <strong>{regiment.version}</strong></span>
              <span>•</span>
              <span>Vigência: <strong>{regiment.effective_date ? format(new Date(regiment.effective_date), 'dd/MM/yyyy') : '-'}</strong></span>
            </div>
          </div>

          {/* Seções */}
          {sections.map((section, index) => {
            if (!section.data) return null;

            return (
              <div key={index} className="page-break-inside-avoid">
                <h3 className="section-title">{section.title}</h3>
                <div className="section-content">
                  {typeof section.data === 'string' ? (
                    <p>{section.data}</p>
                  ) : typeof section.data === 'object' ? (
                    <pre className="whitespace-pre-wrap font-sans">
                      {JSON.stringify(section.data, null, 2)}
                    </pre>
                  ) : null}
                </div>
              </div>
            );
          })}

          {/* Rodapé */}
          <div className="border-t-2 border-gray-900 pt-6 mt-8 print-footer">
            <div className="grid grid-cols-2 gap-8 mb-6">
              <div className="text-center">
                <div className="border-t-2 border-gray-900 pt-2 mt-12">
                  <p className="text-sm font-semibold">Assinatura do Representante Legal</p>
                  <p className="text-xs text-gray-600">{regiment.identification?.company_name}</p>
                </div>
              </div>
              <div className="text-center">
                <div className="border-t-2 border-gray-900 pt-2 mt-12">
                  <p className="text-sm font-semibold">Data</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-center text-gray-500">
              Documento gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm")}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}