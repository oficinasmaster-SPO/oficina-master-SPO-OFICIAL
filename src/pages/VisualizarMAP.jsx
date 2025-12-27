import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ArrowLeft, Printer, FileCheck, Share2, History } from "lucide-react";
import { createPageUrl } from "@/utils";
import ShareProcessDialog from "@/components/processes/ShareProcessDialog";
import ShareHistoryDialog from "@/components/processes/ShareHistoryDialog";

export default function VisualizarMAP() {
  const [searchParams] = useSearchParams();
  const mapId = searchParams.get("id");
  const navigate = useNavigate();
  const [workshop, setWorkshop] = useState(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

  useEffect(() => {
    loadWorkshop();
  }, []);

  const loadWorkshop = async () => {
    try {
      const user = await base44.auth.me();
      const workshops = await base44.entities.Workshop.filter({ owner_id: user.id });
      setWorkshop(workshops[0]);
    } catch (e) {
      console.error(e);
    }
  };

  const { data: map, isLoading } = useQuery({
    queryKey: ['process-map', mapId],
    queryFn: async () => {
      const maps = await base44.entities.ProcessMAP.filter({ id: mapId });
      return maps[0];
    },
    enabled: !!mapId
  });

  const { data: its = [] } = useQuery({
    queryKey: ['map-its', mapId],
    queryFn: async () => {
      return await base44.entities.ProcessIT.filter({ map_id: mapId });
    },
    enabled: !!mapId
  });

  const { data: area } = useQuery({
    queryKey: ['process-area', map?.area_id],
    queryFn: async () => {
      const areas = await base44.entities.ProcessArea.filter({ id: map.area_id });
      return areas[0];
    },
    enabled: !!map?.area_id
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    );
  }

  if (!map) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-xl font-semibold">MAP não encontrado</h1>
        <Button onClick={() => navigate(createPageUrl('BibliotecaProcessos'))}>Voltar</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 print:bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6 print:hidden">
          <Button variant="ghost" onClick={() => navigate(createPageUrl('BibliotecaProcessos'))}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShareDialogOpen(true)}>
              <Share2 className="w-4 h-4 mr-2" /> Compartilhar
            </Button>
            <Button variant="outline" onClick={() => setHistoryDialogOpen(true)}>
              <History className="w-4 h-4 mr-2" /> Histórico
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" /> Imprimir
            </Button>
          </div>
        </div>

        <Card className="shadow-lg print:shadow-none">
          <CardHeader className="border-b-2 border-gray-800 bg-white">
            <div className="flex justify-between items-start">
              <div>
                <Badge className="mb-2">{area?.name || "Área"}</Badge>
                <CardTitle className="text-2xl">{map.code} - {map.title}</CardTitle>
                <p className="text-gray-600 mt-1">{map.description}</p>
              </div>
              <Badge className={map.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                {map.status}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-8 space-y-8">
            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger value="its">ITs ({its.length})</TabsTrigger>
                <TabsTrigger value="details">Detalhes</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <section>
                  <h3 className="text-lg font-bold border-b pb-2 mb-3">1. Objetivo</h3>
                  <p className="text-gray-700 whitespace-pre-line">{map.objective || "Não definido"}</p>
                </section>
                <section>
                  <h3 className="text-lg font-bold border-b pb-2 mb-3">2. Campo de Aplicação</h3>
                  <p className="text-gray-700 whitespace-pre-line">{map.scope || "Não definido"}</p>
                </section>
                <section>
                  <h3 className="text-lg font-bold border-b pb-2 mb-3">3. Fluxo do Processo</h3>
                  <p className="text-gray-700 whitespace-pre-line mb-4">{map.process_flow || "Não definido"}</p>
                  {map.flowchart_url && (
                    <img src={map.flowchart_url} alt="Fluxograma" className="border rounded max-w-full" />
                  )}
                </section>
              </TabsContent>

              <TabsContent value="its" className="space-y-3">
                {its.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Nenhuma IT vinculada ainda</p>
                ) : (
                  its.map(it => (
                    <Card key={it.id} className="hover:shadow-md cursor-pointer" onClick={() => navigate(createPageUrl('VisualizarIT') + `?id=${it.id}`)}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-mono text-sm text-gray-600">{it.code}</span>
                            <h4 className="font-semibold">{it.title}</h4>
                            <p className="text-sm text-gray-600 line-clamp-1">{it.description}</p>
                          </div>
                          <FileCheck className="w-5 h-5 text-blue-600" />
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="details" className="space-y-6">
                {map.responsibilities?.length > 0 && (
                  <section>
                    <h3 className="text-lg font-bold border-b pb-2 mb-3">Responsabilidades</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Atividade</TableHead>
                          <TableHead>Responsável</TableHead>
                          <TableHead>Ferramentas</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {map.responsibilities.map((r, i) => (
                          <TableRow key={i}>
                            <TableCell>{r.activity}</TableCell>
                            <TableCell>{r.responsible}</TableCell>
                            <TableCell>{r.tools}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </section>
                )}
                {map.indicators?.length > 0 && (
                  <section>
                    <h3 className="text-lg font-bold border-b pb-2 mb-3">Indicadores</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Indicador</TableHead>
                          <TableHead>Meta</TableHead>
                          <TableHead>Medição</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {map.indicators.map((ind, i) => (
                          <TableRow key={i}>
                            <TableCell>{ind.name}</TableCell>
                            <TableCell>{ind.target}</TableCell>
                            <TableCell>{ind.measurement}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </section>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
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