import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Printer, Download, Building2, MapPin, Award, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { downloadAtaPDF } from "./AtasPDFGenerator";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import AtaSendOptionsBar from "./AtaSendOptionsBar";
import ClientIntelligenceCapturePanel from "@/components/inteligencia/ClientIntelligenceCapturePanel";
import { sanitizeAtaData, formatPrazoSafe } from "@/utils/ataSanitizer";

export default function VisualizarAtaModal({ ata, workshop, atendimento, onClose }) {
  const [ataAtualizada, setAtaAtualizada] = React.useState(sanitizeAtaData(ata));
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const carregarAtaAtualizada = async () => {
      setIsLoading(true);
      try {
        const dados = await base44.entities.MeetingMinutes.get(ata.id);
        
        // Se os campos textuais estão vazios, buscar o atendimento vinculado para preencher
        let atendimentoRef = atendimento;
        if (!atendimentoRef && dados.atendimento_id) {
          try {
            atendimentoRef = await base44.entities.ConsultoriaAtendimento.get(dados.atendimento_id);
          } catch (e) {
            console.warn("Não foi possível buscar atendimento vinculado:", e);
          }
        }
        
        // Se ainda faltam dados estruturados, carregar fallback do atendimento
        if (!dados.pautas && atendimentoRef?.pauta && Array.isArray(atendimentoRef.pauta)) {
            let pautasTexto = atendimentoRef.pauta
              .filter(p => p.titulo)
              .map(p => `\u2022 ${p.titulo}${p.descricao ? ': ' + p.descricao : ''}`)
              .join('\n');
              
            if (atendimentoRef.topicos_discutidos?.length > 0) {
              pautasTexto += (pautasTexto ? '\n\n' : '') + 'T\u00f3picos Discutidos:\n' + 
                atendimentoRef.topicos_discutidos.map(t => `\u2022 ${t}`).join('\n');
            }
            dados.pautas = pautasTexto;
        }
        
        if (!dados.objetivos_atendimento && atendimentoRef?.objetivos && Array.isArray(atendimentoRef.objetivos)) {
            dados.objetivos_atendimento = atendimentoRef.objetivos
              .filter(o => o)
              .map(o => `\u2022 ${o}`)
              .join('\n');
        }

        if (!dados.objetivos_consultor && atendimentoRef?.observacoes_consultor) {
            dados.objetivos_consultor = atendimentoRef.observacoes_consultor;
        }
        if (!dados.decisoes_tomadas && atendimentoRef?.decisoes_tomadas) {
            dados.decisoes_tomadas = atendimentoRef.decisoes_tomadas;
        }

        if ((!dados.proximos_passos_list || dados.proximos_passos_list.length === 0) && atendimentoRef) {
             dados.proximos_passos_list = atendimentoRef.proximos_passos_list || [];
             if (dados.proximos_passos_list.length === 0 && atendimentoRef.acoes_geradas) {
                 dados.proximos_passos_list = atendimentoRef.acoes_geradas.filter(a => a.acao).map(a => ({
                     descricao: a.acao,
                     responsavel: a.responsavel || "",
                     prazo: a.prazo || ""
                 }));
             }
        }
        
        if (!dados.visao_geral_projeto && atendimentoRef?.visao_geral_projeto) {
            dados.visao_geral_projeto = atendimentoRef.visao_geral_projeto;
        }

        // Fallback: preencher participantes se vazios
        if (!dados.participantes || (Array.isArray(dados.participantes) && dados.participantes.length === 0)) {
          if (atendimentoRef?.participantes && atendimentoRef.participantes.length > 0) {
            dados.participantes = atendimentoRef.participantes.map(p => ({
              name: p.nome || p.name || '',
              role: p.cargo || p.role || ''
            }));
          } else {
            dados.participantes = [{ name: 'Aceleradora Oficinas Master', role: 'Consultor/Acelerador' }];
          }
        }

        // Fallback: preencher responsável se vazio
        if (!dados.responsavel || (typeof dados.responsavel === 'object' && !dados.responsavel.name)) {
          // Buscar workshop se necessário
          let ws = workshop;
          if (!ws && dados.workshop_id) {
            try { ws = await base44.entities.Workshop.get(dados.workshop_id); } catch {}
          }
          dados.responsavel = {
            name: ws?.name || 'Oficina Cliente',
            role: 'Proprietario'
          };
        }

        // Fallback: preencher plano_nome se vazio
        if (!dados.plano_nome) {
          dados.plano_nome = atendimentoRef?.plano_cliente || 'Plano de Aceleracao';
        }

        setAtaAtualizada(sanitizeAtaData(dados));
      } catch (error) {
        console.error("Erro ao carregar ATA:", error);
        setAtaAtualizada(sanitizeAtaData(ata));
      } finally {
        setIsLoading(false);
      }
    };
    
    if (ata?.id) {
      carregarAtaAtualizada();
    } else {
      setIsLoading(false);
    }
  }, [ata?.id, atendimento]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    if (isLoading) {
      toast.warning("Aguarde o carregamento completo dos dados");
      return;
    }
    try {
      let ataParaDownload = sanitizeAtaData({ ...ataAtualizada });
      
      // Tentar encontrar o atendimento se não fornecido
      let atendimentoId = atendimento?.id;
      if (!atendimentoId) {
        const atendimentos = await base44.entities.ConsultoriaAtendimento.filter({ ata_id: ataParaDownload.id });
        if (atendimentos && atendimentos.length > 0) {
          atendimentoId = atendimentos[0].id;
        }
      }

      // Buscar inteligência se tivermos o ID do atendimento
      if (atendimentoId) {
        const intelligence = await base44.entities.ClientIntelligence.filter({ 
          attendance_id: atendimentoId 
        });
        ataParaDownload.client_intelligence = intelligence || [];
      }

      downloadAtaPDF(ataParaDownload, workshop);
      toast.success("PDF baixado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar PDF");
    }
  };

  const handleFinalizar = async () => {
    try {
      await base44.entities.MeetingMinutes.update(ataAtualizada.id, {
        status: 'finalizada'
      });
      setAtaAtualizada(prev => ({ ...prev, status: 'finalizada' }));
      toast.success("ATA finalizada com sucesso!");
    } catch (error) {
      console.error("Erro ao finalizar ATA:", error);
      toast.error("Erro ao finalizar ATA");
    }
  };

  if (!ataAtualizada) return null;

  return (
    <>
      <ClientIntelligenceCapturePanel
        workshopId={workshop?.id}
        ataId={ata?.id}
      />
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto print:max-w-full">
        <DialogHeader className="print:hidden">
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                ATA de Atendimento - {ataAtualizada.code || 'Sem código'}
              </span>
              <div className="flex gap-2">
                {(ataAtualizada.status !== 'finalizada' || !ataAtualizada.status) && (
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={handleFinalizar}>
                    <FileText className="w-4 h-4 mr-2" />
                    Finalizar ATA
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={handleDownload}>
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>
            <AtaSendOptionsBar ata={ataAtualizada} workshop={workshop} atendimento={atendimento} />
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            <p className="text-gray-500">Carregando dados da ATA...</p>
          </div>
        ) : (
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
              <span><strong>Código:</strong> {ataAtualizada.code || '-'}</span>
              <span>
                <strong>Data/Hora:</strong> {ataAtualizada.meeting_date ? new Date(ataAtualizada.meeting_date).toLocaleDateString('pt-BR') : 'Data n/d'} / {ataAtualizada.meeting_time || '00:00'}
              </span>
              <Badge variant={ataAtualizada.status === 'finalizada' ? 'success' : 'secondary'}>
                {ataAtualizada.status === 'finalizada' ? 'Finalizada' : 'Rascunho'}
              </Badge>
            </div>
          </div>

          <div className="border-t-4 border-red-600 pt-4">
            <p className="text-lg">
              <strong>Tipo de Aceleração:</strong> <span className="text-red-600 uppercase">{ataAtualizada.tipo_aceleracao}</span>
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 border border-gray-300">
            <div className="bg-red-600 text-white p-4 font-bold">PARTICIPANTES</div>
            <div className="bg-red-600 text-white p-4 font-bold">RESPONSÁVEL</div>
            <div className="bg-red-600 text-white p-4 font-bold">PLANO</div>
            
            <div className="p-4">
              {Array.isArray(ataAtualizada.participantes) && ataAtualizada.participantes.map((p, i) => (
                <p key={i} className="mb-1">• {typeof p === 'string' ? p : `${p.name || ''} - ${p.role || ''}`}</p>
              ))}
            </div>
            <div className="p-4">
              <p><strong>{typeof ataAtualizada.responsavel === 'string' ? ataAtualizada.responsavel : ataAtualizada.responsavel?.name}</strong></p>
              <p className="text-sm text-gray-600">{typeof ataAtualizada.responsavel === 'string' ? '' : ataAtualizada.responsavel?.role}</p>
            </div>
            <div className="p-4">
              <p>{ataAtualizada.plano_nome}</p>
            </div>
          </div>

          <Card>
            <CardContent className="pt-6">
              <h3 className="font-bold text-lg mb-3 flex items-center gap-2 flex-wrap">
                1. PAUTAS <Badge variant="outline" className="bg-gray-50 text-gray-500 font-normal">Anotações do Consultor</Badge>
              </h3>
              <p className="whitespace-pre-wrap">{ataAtualizada.pautas || "Não informado"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="font-bold text-lg mb-3 flex items-center gap-2 flex-wrap">
                2. OBJETIVOS DO ATENDIMENTO <Badge variant="outline" className="bg-gray-50 text-gray-500 font-normal">Anotações do Consultor</Badge>
              </h3>
              <p className="whitespace-pre-wrap">{ataAtualizada.objetivos_atendimento || "Não informado"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="font-bold text-lg mb-3 flex items-center gap-2 flex-wrap">
                3. OBJETIVOS DO CONSULTOR <Badge variant="outline" className="bg-gray-50 text-gray-500 font-normal">Anotações do Consultor</Badge>
              </h3>
              <p className="whitespace-pre-wrap">{ataAtualizada.objetivos_consultor || "Não informado"}</p>
            </CardContent>
          </Card>

          {ataAtualizada.ata_ia && (
            <Card className="border-purple-200 shadow-sm bg-purple-50/30">
              <CardContent className="pt-6">
                <h3 className="font-bold text-lg mb-1 flex items-center gap-2 flex-wrap text-purple-800">
                  RESUMO EXECUTIVO DA REUNIÃO <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200">Gerado por Inteligência Artificial</Badge>
                </h3>
                <p className="text-sm text-purple-600/80 mb-4 italic">
                  As informações abaixo foram organizadas e geradas automaticamente pela IA baseadas nas anotações da reunião.
                </p>
                <div className="whitespace-pre-wrap text-gray-800 text-sm">
                  {ataAtualizada.ata_ia}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="pt-6">
              <h3 className="font-bold text-lg mb-3 flex items-center gap-2 flex-wrap">
                4. PRÓXIMOS PASSOS <Badge variant="outline" className="bg-gray-50 text-gray-500 font-normal">Anotações do Consultor</Badge>
              </h3>
              {Array.isArray(ataAtualizada.proximos_passos_list) && ataAtualizada.proximos_passos_list.length > 0 ? (
                <div className="space-y-2">
                  {ataAtualizada.proximos_passos_list.map((passo, i) => {
                    const desc = passo.descricao || '';
                    const resp = passo.responsavel || '';
                    const prazoStr = formatPrazoSafe(passo.prazo);
                    return (
                      <div key={i} className="border-l-4 border-blue-600 pl-3">
                        <p className="font-medium">{desc}</p>
                        <p className="text-sm text-gray-600">
                          Responsável: {resp} | Prazo: {prazoStr}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : ataAtualizada.proximos_passos ? (
                <p className="whitespace-pre-wrap">{ataAtualizada.proximos_passos}</p>
              ) : (
                <p>Nenhum próximo passo definido</p>
              )}
            </CardContent>
          </Card>

          {Array.isArray(ataAtualizada.processos_vinculados) && ataAtualizada.processos_vinculados.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-bold text-lg mb-3">📋 PROCESSOS (MAPs) COMPARTILHADOS</h3>
                <p className="text-sm text-gray-600 mb-3 italic">
                  Os processos abaixo foram discutidos e estão disponíveis para consulta no módulo "Processos" da plataforma.
                </p>
                <div className="space-y-3">
                  {ataAtualizada.processos_vinculados.map((processo, i) => (
                    <div key={i} className="border-l-4 border-blue-600 pl-4 py-2 bg-blue-50">
                      <p className="font-medium text-gray-900">• {processo.titulo}</p>
                      <p className="text-sm text-gray-600">Categoria: {processo.categoria}</p>
                      <p className="text-xs text-blue-700 mt-1">
                        📍 Acesse em: Menu → Processos → Buscar "{processo.titulo}"
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {Array.isArray(ataAtualizada.videoaulas_vinculadas) && ataAtualizada.videoaulas_vinculadas.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-bold text-lg mb-3">🎥 VIDEOAULAS RECOMENDADAS</h3>
                <p className="text-sm text-gray-600 mb-3 italic">
                  As videoaulas abaixo foram indicadas e estão disponíveis no módulo "Academia de Treinamento" da plataforma.
                </p>
                <div className="space-y-3">
                  {ataAtualizada.videoaulas_vinculadas.map((video, i) => (
                    <div key={i} className="border-l-4 border-purple-600 pl-4 py-2 bg-purple-50">
                      <p className="font-medium text-gray-900">• {video.titulo}</p>
                      <p className="text-sm text-gray-600">{video.descricao}</p>
                      <p className="text-xs text-purple-700 mt-1">
                        📍 Acesse em: Menu → Academia de Treinamento → {video.descricao} → {video.titulo}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {Array.isArray(ataAtualizada.midias_anexas) && ataAtualizada.midias_anexas.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-bold text-lg mb-3">📎 MÍDIAS E ANEXOS</h3>
                <div className="space-y-3">
                  {ataAtualizada.midias_anexas.map((midia, i) => (
                    <div key={i} className="border rounded-lg p-3 bg-gray-50">
                      {midia.tipo === 'imagem' && midia.url && (
                        <div className="space-y-2">
                          <p className="font-medium text-sm">{midia.titulo || `Imagem ${i + 1}`}</p>
                          <img 
                            src={midia.url} 
                            alt={midia.titulo || 'Imagem anexada'} 
                            className="max-w-full h-auto rounded border"
                          />
                        </div>
                      )}
                      {midia.tipo === 'video' && (
                        <div className="space-y-2">
                          <p className="font-medium text-sm">🎬 {midia.titulo || `Vídeo ${i + 1}`}</p>
                          <p className="text-xs text-gray-600 break-all">{midia.url}</p>
                        </div>
                      )}
                      {midia.tipo === 'link' && (
                        <div className="space-y-1">
                          <p className="font-medium text-sm">🔗 {midia.titulo || `Link ${i + 1}`}</p>
                          <a href={midia.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 break-all hover:underline">
                            {midia.url}
                          </a>
                        </div>
                      )}
                      {midia.tipo === 'documento' && (
                        <div className="space-y-1">
                          <p className="font-medium text-sm">📄 {midia.titulo || `Documento ${i + 1}`}</p>
                          <p className="text-xs text-gray-600 break-all">{midia.url}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {ataAtualizada.visao_geral_projeto && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-bold text-lg mb-3">10. VISÃO GERAL DO PROJETO DE ACELERAÇÃO</h3>
                <p className="whitespace-pre-wrap">{ataAtualizada.visao_geral_projeto || "Não informado"}</p>
              </CardContent>
            </Card>
          )}

          {workshop && (
            <Card className="print:break-before-page">
              <CardContent className="pt-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  Dados da Oficina Cliente
                </h3>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-semibold text-gray-700">Nome da Oficina:</p>
                    <p className="text-gray-900">{workshop.name}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">CNPJ:</p>
                    <p className="text-gray-900">{workshop.cnpj || 'Não informado'}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700 flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      Localização:
                    </p>
                    <p className="text-gray-900">{workshop.city} / {workshop.state}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700 flex items-center gap-1">
                      <Award className="w-4 h-4" />
                      Plano Atual:
                    </p>
                    <p className="text-gray-900">{workshop.planoAtual || 'FREE'}</p>
                  </div>
                  {workshop.segment_auto && (
                    <div>
                      <p className="font-semibold text-gray-700">Segmento:</p>
                      <p className="text-gray-900">{workshop.segment_auto}</p>
                    </div>
                  )}
                  {workshop.employees_count && (
                    <div>
                      <p className="font-semibold text-gray-700">Funcionários:</p>
                      <p className="text-gray-900">{workshop.employees_count}</p>
                    </div>
                  )}
                </div>

                {(workshop.monthly_revenue || workshop.monthly_goals?.projected_revenue) && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="font-semibold text-gray-700 mb-2">Visão Geral & Acesso Rápido:</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {workshop.monthly_revenue && (
                        <div className="bg-blue-50 p-3 rounded">
                          <p className="text-gray-600 text-xs">Faixa de Faturamento:</p>
                          <p className="font-semibold text-blue-900">{workshop.monthly_revenue}</p>
                        </div>
                      )}
                      {workshop.monthly_goals?.projected_revenue && (
                        <div className="bg-green-50 p-3 rounded">
                          <p className="text-gray-600 text-xs">Meta Mensal:</p>
                          <p className="font-semibold text-green-900">
                            R$ {workshop.monthly_goals.projected_revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      )}
                      {workshop.maturity_level && (
                        <div className="bg-purple-50 p-3 rounded">
                          <p className="text-gray-600 text-xs">Fase Atual:</p>
                          <p className="font-semibold text-purple-900">Fase {workshop.maturity_level}</p>
                        </div>
                      )}
                      {workshop.services_offered?.length > 0 && (
                        <div className="bg-orange-50 p-3 rounded">
                          <p className="text-gray-600 text-xs">Serviços Oferecidos:</p>
                          <p className="font-semibold text-orange-900">{workshop.services_offered.length} serviços</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="text-sm text-gray-500 text-center pt-6 border-t print:hidden">
            <p>Gerado por: {ataAtualizada.created_by}</p>
            <p>Data de criação: {ataAtualizada.created_date ? new Date(ataAtualizada.created_date).toLocaleString('pt-BR') : '-'}</p>
          </div>
        </div>
        )}

        <div className="flex justify-end pt-4 border-t print:hidden">
           <Button onClick={onClose}>Fechar</Button>
         </div>
        </DialogContent>
        </Dialog>
        </>
        );
        }