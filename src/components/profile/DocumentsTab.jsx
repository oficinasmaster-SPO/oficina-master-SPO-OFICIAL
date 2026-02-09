import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { FileText, BookOpen, Eye, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";
import RegimentViewer from "@/components/regimento/RegimentViewer";

export default function DocumentsTab({ employee }) {
  const [showRegiment, setShowRegiment] = React.useState(false);
  const [showCulture, setShowCulture] = React.useState(false);

  const { data: workshop } = useQuery({
    queryKey: ['workshop', employee.workshop_id],
    queryFn: async () => {
      if (!employee.workshop_id) return null;
      return await base44.entities.Workshop.get(employee.workshop_id);
    },
    enabled: !!employee.workshop_id
  });

  const { data: regiment } = useQuery({
    queryKey: ['regiment', employee.workshop_id],
    queryFn: async () => {
      if (!employee.workshop_id) return null;
      const result = await base44.entities.CompanyRegiment.filter({ 
        workshop_id: employee.workshop_id,
        status: 'active'
      });
      return result?.[0] || null;
    },
    enabled: !!employee.workshop_id
  });

  const { data: cultureManual } = useQuery({
    queryKey: ['culture-manual', employee.workshop_id],
    queryFn: async () => {
      if (!employee.workshop_id) return null;
      const result = await base44.entities.CultureManual.filter({ 
        workshop_id: employee.workshop_id 
      });
      return result?.[0] || null;
    },
    enabled: !!employee.workshop_id
  });

  const { data: acknowledgments = [] } = useQuery({
    queryKey: ['acknowledgments', employee.user_id],
    queryFn: async () => {
      if (!employee.user_id) return [];
      const result = await base44.entities.RegimentAcknowledgment.filter({ 
        user_id: employee.user_id 
      });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!employee.user_id
  });

  const regimentAck = acknowledgments.find(a => a.document_type === 'regimento' && a.regiment_id === regiment?.id);
  const cultureAck = acknowledgments.find(a => a.document_type === 'manual_cultura');

  if (showRegiment && regiment) {
    return (
      <RegimentViewer 
        regiment={regiment}
        workshop={workshop}
        onClose={() => setShowRegiment(false)}
        autoAcknowledge={true}
      />
    );
  }

  if (showCulture && cultureManual) {
    return (
      <div className="max-w-5xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Manual da Cultura</CardTitle>
              <Button variant="outline" onClick={() => setShowCulture(false)}>
                Voltar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <h2>{cultureManual.title || workshop?.name}</h2>
              {cultureManual.pillars?.map((pillar, index) => (
                <div key={index} className="mb-6">
                  <h3>{pillar.name}</h3>
                  <p>{pillar.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Documentos da Empresa
          </CardTitle>
          <p className="text-sm text-gray-600">
            Acesse e registre ciência dos documentos importantes da empresa
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Regimento Interno */}
          <Card className="border-2 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <FileText className="w-6 h-6 text-blue-700" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Regimento Interno</h3>
                    <p className="text-sm text-gray-600 mb-2">
                      Regulamento jurídico e operacional da empresa
                    </p>
                    {regiment ? (
                      <>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">Versão {regiment.version}</Badge>
                          <Badge className="bg-green-600 text-white">Ativo</Badge>
                        </div>
                        {regimentAck ? (
                          <div className="flex items-center gap-2 text-green-600 text-sm">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Ciente desde {format(new Date(regimentAck.acknowledged_at), "dd/MM/yyyy 'às' HH:mm")}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-orange-600 text-sm">
                            <Clock className="w-4 h-4" />
                            <span>Ciência pendente</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-gray-500">Nenhum regimento ativo</p>
                    )}
                  </div>
                </div>
                {regiment && (
                  <Button onClick={() => setShowRegiment(true)}>
                    <Eye className="w-4 h-4 mr-2" />
                    Visualizar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Manual da Cultura */}
          <Card className="border-2 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <BookOpen className="w-6 h-6 text-purple-700" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Manual da Cultura</h3>
                    <p className="text-sm text-gray-600 mb-2">
                      Pilares, valores e expectativas comportamentais
                    </p>
                    {cultureManual ? (
                      <>
                        {cultureAck ? (
                          <div className="flex items-center gap-2 text-green-600 text-sm">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Ciente desde {format(new Date(cultureAck.acknowledged_at), "dd/MM/yyyy 'às' HH:mm")}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-orange-600 text-sm">
                            <Clock className="w-4 h-4" />
                            <span>Ciência pendente</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-gray-500">Nenhum manual cadastrado</p>
                    )}
                  </div>
                </div>
                {cultureManual && (
                  <Button onClick={() => setShowCulture(true)}>
                    <Eye className="w-4 h-4 mr-2" />
                    Visualizar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}