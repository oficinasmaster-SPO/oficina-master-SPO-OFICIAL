import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Printer } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function VisualizarIT() {
  const [searchParams] = useSearchParams();
  const itId = searchParams.get("id");
  const navigate = useNavigate();

  const { data: it, isLoading } = useQuery({
    queryKey: ['process-it', itId],
    queryFn: async () => {
      const its = await base44.entities.ProcessIT.filter({ id: itId });
      return its[0];
    },
    enabled: !!itId
  });

  const { data: map } = useQuery({
    queryKey: ['parent-map', it?.map_id],
    queryFn: async () => {
      const maps = await base44.entities.ProcessMAP.filter({ id: it.map_id });
      return maps[0];
    },
    enabled: !!it?.map_id
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!it) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-xl font-semibold">IT não encontrada</h1>
        <Button onClick={() => navigate(createPageUrl('BibliotecaProcessos'))}>Voltar</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 print:bg-white">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6 print:hidden">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" /> Imprimir
          </Button>
        </div>

        <Card className="shadow-lg print:shadow-none">
          <CardHeader className="border-b-2 border-gray-800">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono text-sm text-gray-600">{it.code}</span>
                  <Badge className={it.status === 'ativo' ? 'bg-green-100 text-green-700' : ''}>
                    {it.status}
                  </Badge>
                </div>
                <CardTitle className="text-2xl">Instrução de Trabalho</CardTitle>
                <h2 className="text-xl text-gray-700 mt-1">{it.title}</h2>
                {map && (
                  <p className="text-sm text-gray-500 mt-1">MAP: {map.code} - {map.title}</p>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-8 space-y-6">
            <section>
              <h3 className="text-lg font-bold border-b pb-2 mb-3">Descrição</h3>
              <p className="text-gray-700 whitespace-pre-line">{it.description || "Não definido"}</p>
            </section>

            {it.execution_steps?.length > 0 && (
              <section>
                <h3 className="text-lg font-bold border-b pb-2 mb-3">Passos de Execução</h3>
                <div className="space-y-4">
                  {it.execution_steps.map((step, idx) => (
                    <div key={idx} className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                          {step.step}
                        </div>
                        <div className="flex-1">
                          <p className="text-gray-900 font-medium mb-2">{step.description}</p>
                          <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                            <div>
                              <span className="font-semibold">Responsável:</span> {step.responsible || "-"}
                            </div>
                            <div>
                              <span className="font-semibold">Tempo:</span> {step.estimated_time || "-"}
                            </div>
                          </div>
                          {step.tools_required?.length > 0 && (
                            <div className="mt-2">
                              <span className="text-xs font-semibold text-gray-700">Ferramentas: </span>
                              <span className="text-xs text-gray-600">{step.tools_required.join(', ')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {its.length > 0 && (
              <section>
                <h3 className="text-lg font-bold border-b pb-2 mb-3">ITs Relacionadas</h3>
                <div className="space-y-2">
                  {its.filter(i => i.id !== it.id).map(relatedIT => (
                    <div 
                      key={relatedIT.id}
                      className="p-3 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer"
                      onClick={() => navigate(createPageUrl('VisualizarIT') + `?id=${relatedIT.id}`)}
                    >
                      <span className="font-mono text-xs text-gray-600">{relatedIT.code}</span>
                      <p className="font-medium text-sm">{relatedIT.title}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </CardContent>

          <div className="bg-gray-50 p-4 border-t text-center text-xs text-gray-500 print:bg-white">
            Documento gerado pela plataforma Oficinas Master em {new Date().toLocaleDateString()}
          </div>
        </Card>

        <ShareProcessDialog
          open={shareDialogOpen}
          onClose={() => setShareDialogOpen(false)}
          process={map}
          workshop={workshop}
        />

        <ShareHistoryDialog
          open={historyDialogOpen}
          onClose={() => setHistoryDialogOpen(false)}
          process={map}
        />
      </div>
    </div>
  );
}