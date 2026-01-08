import React, { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Printer, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

export default function RegimentViewer({ regiment, workshop, onClose, autoAcknowledge = false }) {
  const [hasAcknowledged, setHasAcknowledged] = React.useState(false);

  const acknowledgeMutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      return await base44.entities.RegimentAcknowledgment.create({
        regiment_id: regiment.id,
        workshop_id: workshop.id,
        user_id: user.id,
        user_email: user.email,
        user_name: user.full_name || user.email,
        acknowledged_at: new Date().toISOString(),
        document_type: 'regimento',
        document_version: regiment.version
      });
    },
    onSuccess: () => {
      setHasAcknowledged(true);
    }
  });

  useEffect(() => {
    if (autoAcknowledge && !hasAcknowledged) {
      acknowledgeMutation.mutate();
    }
  }, [autoAcknowledge]);

  const handlePrint = () => {
    window.print();
  };

  const renderSection = (section, index) => {
    return (
      <div key={section.id || index} className="page-break-inside-avoid mb-6">
        <h3 className="section-title">
          {section.number} {section.title}
        </h3>
        {section.content && (
          <div className="section-content mb-3">{section.content}</div>
        )}
        {section.subsections?.map((subsection, subIndex) => (
          <div key={subsection.id || subIndex} className="ml-6 mb-2">
            <p className="text-sm">
              <strong>{subsection.number}</strong> {subsection.content}
            </p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 print:max-w-full">
      <Card className="border-2 border-blue-200 print:hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {onClose && (
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              )}
              <div>
                <div className="flex items-center gap-2">
                  {regiment.document_code && (
                    <Badge className="bg-blue-600 text-white font-mono">{regiment.document_code}</Badge>
                  )}
                  <CardTitle>Regimento Interno</CardTitle>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">Versão {regiment.version}</Badge>
                  {regiment.status === 'active' && (
                    <Badge className="bg-green-600 text-white">Ativo</Badge>
                  )}
                  {hasAcknowledged && (
                    <Badge className="bg-blue-600 text-white">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Ciência Registrada
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Card className="print-container">
        <CardContent className="p-8 space-y-6">
          {/* Cabeçalho com Logo */}
          <div className="text-center border-b-2 border-gray-900 pb-4 mb-6">
            {workshop?.logo_url && (
              <img 
                src={workshop.logo_url} 
                alt="Logo" 
                className="h-16 mx-auto mb-4 object-contain"
              />
            )}
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              REGIMENTO INTERNO
            </h1>
            <h2 className="text-xl font-semibold text-gray-800">
              {workshop?.name}
            </h2>
            <p className="text-sm text-gray-600 mt-2">
              CNPJ: {workshop?.cnpj} | {workshop?.endereco_completo}
            </p>
            <div className="flex items-center justify-center gap-4 mt-3 text-sm">
              {regiment.document_code && (
                <>
                  <span>Código: <strong>{regiment.document_code}</strong></span>
                  <span>•</span>
                </>
              )}
              <span>Versão: <strong>{regiment.version}</strong></span>
              <span>•</span>
              <span>Vigência: <strong>{regiment.effective_date ? format(new Date(regiment.effective_date), 'dd/MM/yyyy') : '-'}</strong></span>
            </div>
            <p className="text-xs text-gray-500 mt-2 italic">
              Documento Jurídico e Operacional | Aberto para Complementação
            </p>
          </div>

          {/* Seções */}
          {regiment.sections?.map((section, index) => renderSection(section, index))}

          {/* Assinatura */}
          <div className="border-t-2 border-gray-900 pt-6 mt-8 print-footer">
            <h3 className="section-title mb-4">CIÊNCIA E ASSINATURA</h3>
            <p className="section-content mb-6">
              Declaro que li, compreendi e estou ciente de todas as normas deste Regimento Interno.
            </p>
            
            <div className="grid grid-cols-2 gap-8 mb-6">
              <div className="text-center">
                <div className="border-t-2 border-gray-900 pt-2 mt-12">
                  <p className="text-sm font-semibold">Nome do Colaborador</p>
                </div>
              </div>
              <div className="text-center">
                <div className="border-t-2 border-gray-900 pt-2 mt-12">
                  <p className="text-sm font-semibold">Assinatura</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-6">
              <div className="text-center">
                <div className="border-t-2 border-gray-900 pt-2 mt-12">
                  <p className="text-sm font-semibold">Data</p>
                </div>
              </div>
              <div className="text-center">
                <div className="border-t-2 border-gray-900 pt-2 mt-12">
                  <p className="text-sm font-semibold">Testemunha (se necessário)</p>
                </div>
              </div>
            </div>

            <p className="text-xs text-center text-gray-500 italic mt-6">
              Este documento é parte integrante do contrato de trabalho.
            </p>
            <p className="text-xs text-center text-gray-500 mt-2">
              Documento gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm")}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}