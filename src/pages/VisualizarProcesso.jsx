import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ArrowLeft, Download, FileText, AlertTriangle, Share2, GitBranch } from "lucide-react";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import TrackingWrapper from "@/components/shared/TrackingWrapper";
import ImplementationTab from "@/components/processes/ImplementationTab";
import AuditTab from "@/components/processes/AuditTab";
import IndicatorsTab from "@/components/processes/IndicatorsTab";
import ITManager from "@/components/processes/ITManager";
import VersionHistoryDialog from "@/components/processes/VersionHistoryDialog";
import { downloadProcessPDF } from "@/components/processes/ProcessPDFGenerator";

export default function VisualizarProcesso() {
  const [searchParams] = useSearchParams();
  const docId = searchParams.get("id");
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [versionDialogOpen, setVersionDialogOpen] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        // Carregar workshop
        if (currentUser.workshop_id) {
          const w = await base44.entities.Workshop.get(currentUser.workshop_id);
          setWorkshop(w);
        } else {
          const workshops = await base44.entities.Workshop.filter({ owner_id: currentUser.id });
          setWorkshop(workshops[0]);
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadUser();
  }, []);

  const { data: doc, isLoading } = useQuery({
    queryKey: ['process-document', docId],
    queryFn: async () => {
      const docs = await base44.entities.ProcessDocument.filter({ id: docId });
      return docs[0];
    },
    enabled: !!docId
  });

  const { data: its = [] } = useQuery({
    queryKey: ['process-its', docId],
    queryFn: async () => {
      const result = await base44.entities.InstructionDocument.filter({ parent_map_id: docId });
      return result.sort((a, b) => (a.order || 0) - (b.order || 0));
    },
    enabled: !!docId
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-xl font-semibold">Processo não encontrado</h1>
        <Button onClick={() => navigate(createPageUrl('MeusProcessos'))}>Voltar</Button>
      </div>
    );
  }

  const content = doc.content_json || {};

  const handleDownloadPDF = () => {
    toast.promise(
      Promise.resolve(downloadProcessPDF(doc, its, workshop)),
      {
        loading: 'Gerando PDF...',
        success: 'PDF baixado com sucesso!',
        error: 'Erro ao gerar PDF'
      }
    );
  };

  return (
    <TrackingWrapper
      workshopId={workshop?.id}
      itemTipo="processo"
      itemId={doc?.id}
      itemNome={doc?.title}
      itemCategoria={doc?.category}
    >
      <div className="min-h-screen bg-gray-50 py-8 px-4 print:bg-white print:p-0">
      <div className="max-w-6xl mx-auto print:max-w-full">
        <div className="flex justify-between items-center mb-6 print:hidden">
          <Button variant="ghost" onClick={() => navigate(createPageUrl('MeusProcessos'))}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setVersionDialogOpen(true)}>
              <GitBranch className="w-4 h-4 mr-2" /> Versões
            </Button>
            {doc.pdf_url && (
              <Button variant="outline" onClick={() => window.open(doc.pdf_url, '_blank')}>
                <FileText className="w-4 h-4 mr-2" /> Ver PDF
              </Button>
            )}
            <Button onClick={handleDownloadPDF} className="bg-blue-600 hover:bg-blue-700">
              <Download className="w-4 h-4 mr-2" /> Download PDF
            </Button>
          </div>
        </div>

        <Tabs defaultValue="conteudo" className="mb-6 print:hidden">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="conteudo">Conteúdo MAP</TabsTrigger>
            <TabsTrigger value="its">ITs & FRs</TabsTrigger>
            <TabsTrigger value="implementacao">Implementação</TabsTrigger>
            <TabsTrigger value="auditoria">Auditoria</TabsTrigger>
            <TabsTrigger value="indicadores">Indicadores</TabsTrigger>
          </TabsList>

          <TabsContent value="conteudo" className="mt-6 print:block">

        <div className="bg-white shadow-lg rounded-lg overflow-hidden border border-gray-200 print:shadow-none print:border-0">
          {/* Cabeçalho MAP */}
          <div className="border-b-2 border-gray-800 p-6 flex justify-between items-center">
            <div className="flex items-center gap-4">
              {/* Logo Placeholder - poderia vir da oficina */}
              <div className="w-16 h-16 bg-red-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                OM
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 uppercase">Mapa da Auto Gestão do Processo</h1>
                <h2 className="text-lg text-gray-600">{doc.title}</h2>
              </div>
            </div>
            <div className="text-right text-sm text-gray-600">
              <p><strong>Código:</strong> {doc.code || "N/A"}</p>
              <p><strong>Versão:</strong> {doc.revision || "1"}</p>
              <p><strong>Data:</strong> {new Date(doc.updated_date || doc.created_date).toLocaleDateString()}</p>
              <Badge variant="outline" className="mt-1">{doc.category}</Badge>
              {doc.status && (
                <Badge 
                  variant={doc.status === 'ativo' ? 'default' : doc.status === 'obsoleto' ? 'destructive' : 'secondary'} 
                  className="mt-1 ml-2"
                >
                  {doc.status}
                </Badge>
              )}
            </div>
          </div>

          <div className="p-8 space-y-8">
            
            {/* 1. Objetivo */}
            <section>
              <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-3 uppercase flex items-center gap-2">
                1. Objetivo
              </h3>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {content.objetivo || "Não definido."}
              </p>
            </section>

            {/* 2. Campo de Aplicação */}
            <section>
              <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-3 uppercase flex items-center gap-2">
                2. Campo de Aplicação
              </h3>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {content.campo_aplicacao || "Não definido."}
              </p>
            </section>

            {/* 3. Informações Complementares */}
            <section>
              <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-3 uppercase flex items-center gap-2">
                3. Informações Complementares
              </h3>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {content.informacoes_complementares || "Não definido."}
              </p>
            </section>

            {/* 4. Fluxo do Processo */}
            <section>
              <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-3 uppercase flex items-center gap-2">
                4. Fluxo do Processo
              </h3>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line mb-4">
                {content.fluxo_processo || "Ver fluxograma abaixo."}
              </p>
              {content.fluxo_image_url ? (
                <div className="border rounded-lg p-2 bg-gray-50 flex justify-center">
                  <img 
                    src={content.fluxo_image_url} 
                    alt="Fluxograma" 
                    className="max-w-full h-auto max-h-[600px] object-contain" 
                  />
                </div>
              ) : (
                <div className="text-gray-400 italic text-sm border border-dashed p-4 text-center rounded">
                  Nenhum fluxograma anexado.
                </div>
              )}
            </section>

            {/* PDF Embed (Fallback se não houver conteúdo estruturado mas houver PDF) */}
            {doc.pdf_url && (!content.atividades || content.atividades.length === 0) && (
              <section className="break-inside-avoid mt-8">
                <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-3 uppercase flex items-center gap-2">
                  Documento Original (PDF)
                </h3>
                <div className="border rounded-lg overflow-hidden h-[800px] bg-gray-100">
                  <iframe 
                    src={doc.pdf_url} 
                    className="w-full h-full" 
                    title="PDF Viewer"
                  >
                    <p>Seu navegador não suporta visualização de PDF. <a href={doc.pdf_url}>Clique para baixar.</a></p>
                  </iframe>
                </div>
              </section>
            )}

            {/* 5. Atividades */}
            <section className="break-inside-avoid">
              <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-3 uppercase flex items-center gap-2">
                5. Atividades e Responsabilidades
              </h3>
              {content.atividades && content.atividades.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-100">
                      <TableHead className="w-[50%] font-bold text-gray-900">Atividade</TableHead>
                      <TableHead className="font-bold text-gray-900">Responsável</TableHead>
                      <TableHead className="font-bold text-gray-900">Ferramentas/Docs</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {content.atividades.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="align-top">{item.atividade}</TableCell>
                        <TableCell className="align-top">{item.responsavel}</TableCell>
                        <TableCell className="align-top">{item.ferramentas}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-gray-500 italic">Nenhuma atividade registrada.</p>
              )}
            </section>

            {/* 6. Matriz de Riscos */}
            <section className="break-inside-avoid">
              <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-3 uppercase flex items-center gap-2">
                6. Matriz de Riscos
              </h3>
              {content.matriz_riscos && content.matriz_riscos.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-100">
                      <TableHead className="font-bold text-gray-900">Identificação</TableHead>
                      <TableHead className="font-bold text-gray-900">Fonte</TableHead>
                      <TableHead className="font-bold text-gray-900">Impacto</TableHead>
                      <TableHead className="font-bold text-gray-900">Categoria</TableHead>
                      <TableHead className="font-bold text-gray-900">Controle</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {content.matriz_riscos.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{item.identificacao}</TableCell>
                        <TableCell>{item.fonte}</TableCell>
                        <TableCell>{item.impacto}</TableCell>
                        <TableCell>
                          <Badge variant={item.categoria === 'Alto' ? 'destructive' : item.categoria === 'Médio' ? 'secondary' : 'outline'}>
                            {item.categoria}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.controle}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-gray-500 italic">Nenhum risco mapeado.</p>
              )}
            </section>

            {/* 7. Inter-relação */}
            <section className="break-inside-avoid">
              <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-3 uppercase flex items-center gap-2">
                7. Inter-relação entre Áreas
              </h3>
              {content.inter_relacoes && content.inter_relacoes.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-100">
                      <TableHead className="w-[30%] font-bold text-gray-900">Área</TableHead>
                      <TableHead className="font-bold text-gray-900">Interação (Entrada/Saída)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {content.inter_relacoes.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{item.area}</TableCell>
                        <TableCell>{item.interacao}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-gray-500 italic">Nenhuma inter-relação mapeada.</p>
              )}
            </section>

            {/* 8. Indicadores */}
            <section className="break-inside-avoid">
              <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-3 uppercase flex items-center gap-2">
                8. Indicadores de Desempenho
              </h3>
              {content.indicadores && content.indicadores.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-100">
                      <TableHead className="font-bold text-gray-900">Indicador</TableHead>
                      <TableHead className="font-bold text-gray-900">Meta</TableHead>
                      <TableHead className="font-bold text-gray-900">Como Medir</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {content.indicadores.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{item.indicador}</TableCell>
                        <TableCell>{item.meta}</TableCell>
                        <TableCell>{item.como_medir}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-gray-500 italic">Nenhum indicador definido.</p>
              )}
            </section>

          </div>
          
          {/* Footer */}
          <div className="bg-gray-50 p-4 border-t text-center text-xs text-gray-500 print:bg-white print:border-t-2">
            Documento gerado eletronicamente pela plataforma Oficinas Master. Impresso em {new Date().toLocaleDateString()}.
          </div>
        </div>
          </TabsContent>

          <TabsContent value="its" className="mt-6 print:block">
            <ITManager mapId={doc.id} workshopId={workshop?.id} printMode />
          </TabsContent>

          <TabsContent value="implementacao" className="mt-6">
            <ImplementationTab processId={doc.id} workshopId={workshop?.id} />
          </TabsContent>

          <TabsContent value="auditoria" className="mt-6">
            <AuditTab processId={doc.id} workshopId={workshop?.id} />
          </TabsContent>

          <TabsContent value="indicadores" className="mt-6">
            <IndicatorsTab processId={doc.id} workshopId={workshop?.id} />
          </TabsContent>
        </Tabs>

        <VersionHistoryDialog
          open={versionDialogOpen}
          onClose={() => setVersionDialogOpen(false)}
          versionHistory={doc?.version_history || []}
          currentRevision={doc?.revision || "1"}
          onAddVersion={(versionData) => {
            setVersionDialogOpen(false);
            // Redirecionar para edição com nova versão
            navigate(createPageUrl('GerenciarProcessos') + `?edit=${doc.id}&new_version=${versionData.revision}&reason=${encodeURIComponent(versionData.reason)}&origin=${versionData.origin}&impact=${encodeURIComponent(versionData.expected_impact || '')}`);
          }}
        />
      </div>
      </div>
    </TrackingWrapper>
  );
}