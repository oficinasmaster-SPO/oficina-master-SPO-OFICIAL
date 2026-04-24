import React, { useRef, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Download, Building2, MapPin, Award, Send, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import ClientIntelligenceCapturePanel from "@/components/inteligencia/ClientIntelligenceCapturePanel";
import { sanitizeAtaData, formatPrazoSafe } from "@/utils/ataSanitizer";

export default function VisualizarAtaModal({ ata, workshop, atendimento, onClose }) {
  const ataContentRef = useRef(null);
  const [ataAtualizada, setAtaAtualizada] = React.useState(sanitizeAtaData(ata));
  const [isLoading, setIsLoading] = React.useState(true);

  const [clientIntelligence, setClientIntelligence] = React.useState([]);
  const d = ataAtualizada;

  React.useEffect(() => {
    const carregarAtaAtualizada = async () => {
      setIsLoading(true);
      try {
        const dados = await base44.entities.MeetingMinutes.get(ata.id);

        let atendimentoRef = atendimento;
        if (!atendimentoRef && dados.atendimento_id) {
          try {
            atendimentoRef = await base44.entities.ConsultoriaAtendimento.get(dados.atendimento_id);
          } catch (e) {
            console.warn("Não foi possível buscar atendimento vinculado:", e);
          }
        }

        // Fallbacks do atendimento
        if (!dados.pautas && atendimentoRef?.pauta && Array.isArray(atendimentoRef.pauta)) {
          let pautasTexto = atendimentoRef.pauta.filter(p => p.titulo).map(p => `• ${p.titulo}${p.descricao ? ': ' + p.descricao : ''}`).join('\n');
          if (atendimentoRef.topicos_discutidos?.length > 0) {
            pautasTexto += (pautasTexto ? '\n\n' : '') + 'Tópicos Discutidos:\n' + atendimentoRef.topicos_discutidos.map(t => `• ${t}`).join('\n');
          }
          dados.pautas = pautasTexto;
        }
        if (!dados.objetivos_atendimento && atendimentoRef?.objetivos && Array.isArray(atendimentoRef.objetivos)) {
          dados.objetivos_atendimento = atendimentoRef.objetivos.filter(o => o).map(o => `• ${o}`).join('\n');
        }
        if (!dados.objetivos_consultor && atendimentoRef?.observacoes_consultor) {
          dados.objetivos_consultor = atendimentoRef.observacoes_consultor;
        }
        if (!dados.decisoes_tomadas && atendimentoRef?.decisoes_tomadas) {
          dados.decisoes_tomadas = atendimentoRef.decisoes_tomadas;
        }
        if ((!dados.acoes_geradas || dados.acoes_geradas.length === 0) && atendimentoRef?.acoes_geradas) {
          dados.acoes_geradas = atendimentoRef.acoes_geradas;
        }
        if ((!dados.proximos_passos_list || dados.proximos_passos_list.length === 0) && atendimentoRef) {
          dados.proximos_passos_list = atendimentoRef.proximos_passos_list || [];
          if (dados.proximos_passos_list.length === 0 && atendimentoRef.acoes_geradas) {
            dados.proximos_passos_list = atendimentoRef.acoes_geradas.filter(a => a.acao).map(a => ({ descricao: a.acao, responsavel: a.responsavel || "", prazo: a.prazo || "" }));
          }
        }
        if (!dados.visao_geral_projeto && atendimentoRef?.visao_geral_projeto) {
          dados.visao_geral_projeto = atendimentoRef.visao_geral_projeto;
        }
        if ((!dados.midias_anexas || dados.midias_anexas.length === 0) && atendimentoRef?.midias_anexas) {
          dados.midias_anexas = atendimentoRef.midias_anexas;
        }
        if ((!dados.videoaulas_vinculadas || dados.videoaulas_vinculadas.length === 0) && atendimentoRef?.videoaulas_vinculadas) {
          dados.videoaulas_vinculadas = atendimentoRef.videoaulas_vinculadas;
        }
        if ((!dados.processos_vinculados || dados.processos_vinculados.length === 0) && atendimentoRef?.processos_vinculados) {
          dados.processos_vinculados = atendimentoRef.processos_vinculados;
        }
        if ((!dados.checklist_respostas || dados.checklist_respostas.length === 0) && atendimentoRef?.checklist_respostas) {
          dados.checklist_respostas = atendimentoRef.checklist_respostas;
        }

        // Participantes fallback
        if (!dados.participantes || (Array.isArray(dados.participantes) && dados.participantes.length === 0)) {
          if (atendimentoRef?.participantes?.length > 0) {
            dados.participantes = atendimentoRef.participantes.map(p => ({ name: p.nome || p.name || '', role: p.cargo || p.role || '' }));
          } else {
            dados.participantes = [{ name: 'Aceleradora Oficinas Master', role: 'Consultor/Acelerador' }];
          }
        }
        if (!dados.responsavel || (typeof dados.responsavel === 'object' && !dados.responsavel.name)) {
          let ws = workshop;
          if (!ws && dados.workshop_id) { try { ws = await base44.entities.Workshop.get(dados.workshop_id); } catch {} }
          dados.responsavel = { name: ws?.name || 'Oficina Cliente', role: 'Proprietario' };
        }
        if (!dados.plano_nome) {
          dados.plano_nome = atendimentoRef?.plano_cliente || 'Plano de Aceleracao';
        }

        // Buscar inteligência do cliente
        const atendimentoId = atendimentoRef?.id || dados.atendimento_id;
        if (atendimentoId) {
          try {
            const intel = await base44.entities.ClientIntelligence.filter({ attendance_id: atendimentoId });
            setClientIntelligence(intel || []);
          } catch {}
        }
        // Também usar client_intelligence da ATA se existir
        if (dados.client_intelligence?.length > 0 && clientIntelligence.length === 0) {
          setClientIntelligence(dados.client_intelligence);
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

  const handleDownload = () => {
    if (isLoading) {
      toast.warning('Aguarde o carregamento completo da ATA');
      return;
    }
    window.print();
  };



  const handleFinalizar = async () => {
    try {
      await base44.entities.MeetingMinutes.update(ataAtualizada.id, { status: 'finalizada' });
      setAtaAtualizada(prev => ({ ...prev, status: 'finalizada' }));
      toast.success("ATA finalizada com sucesso!");
    } catch (error) {
      toast.error("Erro ao finalizar ATA");
    }
  };

  const handleEnviarEmail = async () => {
    try {
      await base44.functions.invoke('enviarEmailATA', {
        ata_id: ataAtualizada.id,
        atendimento_id: atendimento?.id,
      });
      toast.success("ATA enviada por email com sucesso!");
    } catch (error) {
      toast.error("Erro ao enviar email: " + (error.response?.data?.error || error.message));
    }
  };

  if (!ataAtualizada) return null;

  // Validar se tem dados suficientes para PDF
  const hasValidContent = !!(
    d.pautas || 
    d.objetivos_atendimento || 
    d.objetivos_consultor || 
    d.proximos_passos_list?.length > 0 || 
    d.acoes_geradas?.length > 0
  );

  // Dados para inteligência combinada (da ATA ou busca separada)
  const intelData = clientIntelligence.length > 0 ? clientIntelligence : (d.client_intelligence || []);

  return (
    <>
      <ClientIntelligenceCapturePanel workshopId={workshop?.id} ataId={ata?.id} />
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] p-0 flex flex-col overflow-hidden print:max-w-full">
          <DialogHeader className="print:hidden flex-shrink-0 px-6 py-4 border-b">
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="flex items-center gap-2 font-semibold">
                  <FileText className="w-5 h-5" />
                  ATA de Atendimento - {d.code || 'Sem código'}
                </span>
                <div className="flex gap-2">
                   {d.status !== 'finalizada' && (
                     <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={handleFinalizar}>
                       <FileText className="w-4 h-4 mr-2" />Finalizar ATA
                     </Button>
                   )}
                   <Button
                     size="sm"
                     variant="outline"
                     onClick={handleEnviarEmail}
                     disabled={isLoading}
                   >
                     <Send className="w-4 h-4 mr-2" />
                     Enviar E-mail
                   </Button>
                   <Button
                     size="sm"
                     variant="outline"
                     onClick={handleDownload}
                     disabled={isLoading}
                   >
                     <Download className="w-4 h-4 mr-2" />
                     Download PDF
                   </Button>
                   </div>
              </div>
              </div>
              {!hasValidContent && !isLoading && (
              <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800">
                ⚠️ Preencha pelo menos uma seção (Pautas, Objetivos, Próximos Passos ou Ações) para gerar o PDF.
              </div>
              )}
              </DialogHeader>

              {isLoading ? (
           <div className="flex flex-col items-center justify-center py-16 gap-3">
             <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
             <p className="text-gray-500">Carregando dados da ATA...</p>
           </div>
          ) : (
            <div ref={ataContentRef} className="document flex-1 overflow-y-auto px-6">
               {/* FIXED HEADER - Aparece em todas as páginas */}
               <div className="document-header">
                 <h1>GESTÃO DE PROCESSOS</h1>
                 <p>Ata de Atendimento - Aceleração de Oficinas</p>
               </div>

               {/* DOCUMENT CONTENT */}
               <div className="document-content space-y-6">
               {/* CABEÇALHO */}
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900">GESTÃO DE PROCESSOS</h2>
                <p className="text-lg">AT - Ata de Atendimento</p>
                <div className="flex items-center justify-between mt-4 text-sm">
                  <span><strong>Código:</strong> {d.code || '-'}</span>
                  <span><strong>Data/Hora:</strong> {d.meeting_date ? new Date(d.meeting_date).toLocaleDateString('pt-BR') : '-'} / {d.meeting_time || '00:00'}</span>
                  <Badge variant={d.status === 'finalizada' ? 'success' : 'secondary'}>
                    {d.status === 'finalizada' ? 'Finalizada' : 'Rascunho'}
                  </Badge>
                </div>
              </div>

              {/* TIPO ACELERAÇÃO */}
              <div className="border-t-4 border-red-600 pt-4">
                <p className="text-lg"><strong>Tipo de Aceleração:</strong> <span className="text-red-600 uppercase">{d.tipo_aceleracao}</span></p>
              </div>

              {/* TABELA PARTICIPANTES */}
              <div className="grid grid-cols-3 gap-0 border border-gray-300">
                <div className="bg-red-600 text-white p-3 font-bold text-sm">PARTICIPANTES</div>
                <div className="bg-red-600 text-white p-3 font-bold text-sm">RESPONSÁVEL</div>
                <div className="bg-red-600 text-white p-3 font-bold text-sm">PLANO</div>
                <div className="p-3 border-r">
                  {Array.isArray(d.participantes) && d.participantes.map((p, i) => (
                    <p key={i} className="mb-1 text-sm">• {typeof p === 'string' ? p : `${p.name || ''} - ${p.role || ''}`}</p>
                  ))}
                </div>
                <div className="p-3 border-r">
                  <p className="font-medium text-sm">{typeof d.responsavel === 'string' ? d.responsavel : d.responsavel?.name}</p>
                  <p className="text-xs text-gray-600">{typeof d.responsavel === 'string' ? '' : d.responsavel?.role}</p>
                </div>
                <div className="p-3"><p className="text-sm">{d.plano_nome}</p></div>
              </div>

              {/* 1. PAUTAS */}
              <SectionCard num="1" title="PAUTAS" subtitle="Anotações do Consultor" content={d.pautas} items={d.pauta} renderItems={(items) => items.filter(p => p.titulo).map((p, i) => (
                <div key={i} className="mb-2">
                  <p className="font-medium">{i + 1}. {p.titulo}</p>
                  {p.descricao && <p className="text-sm text-gray-600 ml-4">{p.descricao}</p>}
                  {p.tempo_estimado && <p className="text-xs text-gray-500 ml-4">Tempo estimado: {p.tempo_estimado} min</p>}
                </div>
              ))} />

              {/* 2. OBJETIVOS DO ATENDIMENTO */}
              <SectionCard num="2" title="OBJETIVOS DO ATENDIMENTO" subtitle="Anotações do Consultor" content={d.objetivos_atendimento} items={d.objetivos} renderItems={(items) => items.filter(o => o).map((o, i) => <p key={i} className="mb-1">• {o}</p>)} />

              {/* 3. OBSERVAÇÕES E OBJETIVOS DO CONSULTOR */}
              <SectionCard num="3" title="OBSERVAÇÕES E OBJETIVOS DO CONSULTOR" subtitle="Anotações" content={d.objetivos_consultor || d.observacoes_consultor} />

              {/* 4. PRÓXIMOS PASSOS */}
              {((Array.isArray(d.proximos_passos_list) && d.proximos_passos_list.length > 0) || d.proximos_passos) && (
                <Card>
                  <CardContent className="pt-6">
                    <SectionTitle num="4" title="PRÓXIMOS PASSOS" subtitle="Anotações do Consultor" />
                    {Array.isArray(d.proximos_passos_list) && d.proximos_passos_list.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600 mb-3 italic">Por fim, ficaram definidos como próximos passos:</p>
                        {d.proximos_passos_list.map((passo, i) => (
                          <div key={i} className="border-l-4 border-blue-600 pl-3 py-1">
                            <p className="font-medium">{passo.descricao}</p>
                            <p className="text-sm text-gray-600">
                              {passo.responsavel && `Responsável: ${passo.responsavel}`}
                              {passo.responsavel && passo.prazo && ' | '}
                              {passo.prazo && `Prazo: ${formatPrazoSafe(passo.prazo)}`}
                            </p>
                          </div>
                        ))}
                        {d.proximos_passos && <p className="whitespace-pre-wrap text-sm text-gray-700 mt-3 pt-3 border-t">{d.proximos_passos}</p>}
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{d.proximos_passos}</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* 5. RESUMO EXECUTIVO (IA) */}
              {d.ata_ia && (
                <Card className="border-purple-200 bg-purple-50/30">
                  <CardContent className="pt-6">
                    <h3 className="font-bold text-lg mb-1 flex items-center gap-2 flex-wrap text-purple-800">
                      5. RESUMO EXECUTIVO DA REUNIÃO
                      <Badge className="bg-purple-100 text-purple-700 border-purple-200 font-normal">Gerado por Inteligência Artificial</Badge>
                    </h3>
                    <p className="text-sm text-purple-600/80 mb-4 italic">As informações abaixo foram organizadas e geradas automaticamente pela IA baseadas nas anotações da reunião.</p>
                    <div className="prose prose-sm max-w-none text-gray-800">
                      <ReactMarkdown>{d.ata_ia}</ReactMarkdown>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 6. DECISÕES TOMADAS */}
              {Array.isArray(d.decisoes_tomadas) && d.decisoes_tomadas.length > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <SectionTitle num="6" title="DECISÕES TOMADAS" subtitle="Anotações do Consultor" />
                    <div className="space-y-3">
                      {d.decisoes_tomadas.map((dec, i) => (
                        <div key={i} className="border-l-4 border-blue-500 pl-3 py-2 bg-blue-50 rounded-r">
                          <p className="font-medium text-gray-900">{dec.decisao}</p>
                          <p className="text-sm text-gray-600">
                            {dec.responsavel && `Responsável: ${dec.responsavel}`}
                            {dec.responsavel && dec.prazo && ' | '}
                            {dec.prazo && `Prazo: ${formatPrazoSafe(dec.prazo)}`}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 7. AÇÕES DE ACOMPANHAMENTO */}
              {Array.isArray(d.acoes_geradas) && d.acoes_geradas.length > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <SectionTitle num="7" title="AÇÕES DE ACOMPANHAMENTO" subtitle="Anotações do Consultor" />
                    <div className="space-y-3">
                      {d.acoes_geradas.map((acao, i) => (
                        <div key={i} className="border-l-4 border-green-500 pl-3 py-2 bg-green-50 rounded-r">
                          <p className="font-medium text-gray-900">{acao.acao}</p>
                          <p className="text-sm text-gray-600">
                            {acao.responsavel && `Responsável: ${acao.responsavel}`}
                            {acao.prazo && ` | Prazo: ${formatPrazoSafe(acao.prazo)}`}
                            {acao.status && ` | Status: ${acao.status}`}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 8. PROCESSOS (MAPs) COMPARTILHADOS */}
              {Array.isArray(d.processos_vinculados) && d.processos_vinculados.length > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <SectionTitle num="8" title="PROCESSOS (MAPs) COMPARTILHADOS" />
                    <p className="text-sm text-gray-600 mb-3 italic">Os processos abaixo foram discutidos e estão disponíveis para consulta no módulo Processos da plataforma.</p>
                    <div className="space-y-3">
                      {d.processos_vinculados.map((proc, i) => (
                        <div key={i} className="border-l-4 border-blue-600 pl-4 py-2 bg-blue-50 rounded-r">
                          <p className="font-medium text-gray-900">• {proc.titulo}</p>
                          <p className="text-sm text-gray-600">Categoria: {proc.categoria}</p>
                          <p className="text-xs text-blue-700 mt-1">Acesse em: Menu → Processos → Buscar "{proc.titulo}"</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 9. VIDEOAULAS RECOMENDADAS */}
              {Array.isArray(d.videoaulas_vinculadas) && d.videoaulas_vinculadas.length > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <SectionTitle num="9" title="VIDEOAULAS RECOMENDADAS" />
                    <p className="text-sm text-gray-600 mb-3 italic">As videoaulas abaixo foram indicadas e estão disponíveis no módulo Academia de Treinamento da plataforma.</p>
                    <div className="space-y-3">
                      {d.videoaulas_vinculadas.map((video, i) => (
                        <div key={i} className="border-l-4 border-purple-600 pl-4 py-2 bg-purple-50 rounded-r">
                          <p className="font-medium text-gray-900">• {video.titulo}</p>
                          <p className="text-sm text-gray-600">{video.descricao}</p>
                          <p className="text-xs text-purple-700 mt-1">Acesse em: Menu → Academia de Treinamento → {video.descricao} → {video.titulo}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 10. MÍDIAS E ANEXOS */}
              {Array.isArray(d.midias_anexas) && d.midias_anexas.length > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <SectionTitle num="10" title="MÍDIAS E ANEXOS" />
                    <div className="space-y-3">
                      {d.midias_anexas.map((midia, i) => (
                        <div key={i} className="border rounded-lg p-3 bg-gray-50">
                          <MidiaItem midia={midia} index={i} />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 11. VISÃO GERAL DO PROJETO */}
              <SectionCard num="11" title="VISÃO GERAL DO PROJETO DE ACELERAÇÃO" content={d.visao_geral_projeto} />

              {/* 12. CHECKLIST DE DIAGNÓSTICO */}
              {Array.isArray(d.checklist_respostas) && d.checklist_respostas.length > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <SectionTitle num="12" title="CHECKLIST DE DIAGNÓSTICO" />
                    <div className="space-y-4">
                      {d.checklist_respostas.map((bloco, bi) => (
                        <div key={bi}>
                          <h4 className="font-semibold text-gray-900 mb-2">{bloco.template_nome || 'Checklist'}</h4>
                          {bloco.template_tema && <p className="text-xs text-gray-500 mb-2">Tema: {bloco.template_tema}</p>}
                          <div className="space-y-2">
                            {(bloco.perguntas || []).filter(p => p.resposta_atual || p.resposta_meta).map((p, pi) => (
                              <div key={pi} className="border-l-4 border-amber-400 pl-3 py-1 bg-amber-50 rounded-r">
                                <p className="font-medium text-sm text-gray-900">{p.pergunta_texto}</p>
                                {p.resposta_atual && <p className="text-xs text-gray-600">Atual: {p.resposta_atual}</p>}
                                {p.resposta_meta && <p className="text-xs text-gray-600">Meta: {p.resposta_meta}</p>}
                                {p.atingimento_descritivo && <p className="text-xs text-gray-600">Atingimento: {p.atingimento_descritivo}</p>}
                                {p.pct_atingimento && <p className="text-xs text-green-700 font-medium">{p.pct_atingimento}% atingido</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 13. INTELIGÊNCIA DO CLIENTE */}
              {intelData.length > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <SectionTitle num="13" title="INTELIGÊNCIA DO CLIENTE (DORES E OPORTUNIDADES)" />
                    <div className="space-y-3">
                      {intelData.map((item, i) => (
                        <div key={i} className="border-l-4 border-orange-400 pl-3 py-2 bg-orange-50 rounded-r">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-orange-800 text-sm">{item.area} - {item.type}</p>
                            <Badge variant="outline" className="text-xs">{item.gravityLabel || item.gravity || 'Média'}</Badge>
                          </div>
                          <p className="font-semibold text-gray-900 text-sm mt-1">{item.subcategory || item.title}</p>
                          {item.description && <p className="text-sm text-gray-600 mt-1">{item.description}</p>}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* AI SUMMARY (análise estruturada) */}
              {d.ai_summary && (
                <Card className="border-indigo-200 bg-indigo-50/30">
                  <CardContent className="pt-6">
                    <h3 className="font-bold text-lg mb-3 text-indigo-800">Análise Inteligente Contextual</h3>
                    <div className="space-y-3 text-sm">
                      {d.ai_summary.resumo_executivo && (
                        <div><p className="font-medium text-gray-900">📝 Resumo Executivo:</p><p className="text-gray-700 mt-1">{d.ai_summary.resumo_executivo}</p></div>
                      )}
                      {d.ai_summary.problemas_recorrentes?.length > 0 && (
                        <div><p className="font-medium text-red-900">🔴 Problemas Recorrentes:</p><ul className="list-disc ml-4 text-gray-700 mt-1">{d.ai_summary.problemas_recorrentes.map((p, i) => <li key={i}>{p}</li>)}</ul></div>
                      )}
                      {d.ai_summary.evolucao_cliente && (
                        <div><p className="font-medium text-green-900">📈 Evolução do Cliente:</p><p className="text-gray-700 mt-1">{d.ai_summary.evolucao_cliente}</p></div>
                      )}
                      {d.ai_summary.recomendacoes?.length > 0 && (
                        <div><p className="font-medium text-blue-900">💡 Recomendações:</p><ul className="list-disc ml-4 text-gray-700 mt-1">{d.ai_summary.recomendacoes.map((r, i) => <li key={i}>{r}</li>)}</ul></div>
                      )}
                      {d.ai_summary.pontos_atencao?.length > 0 && (
                        <div><p className="font-medium text-orange-900">⚠️ Pontos de Atenção:</p><ul className="list-disc ml-4 text-gray-700 mt-1">{d.ai_summary.pontos_atencao.map((p, i) => <li key={i}>{p}</li>)}</ul></div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* DADOS DA OFICINA */}
              {workshop && (
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-600" />Dados da Oficina Cliente
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><p className="font-semibold text-gray-700">Nome:</p><p>{workshop.name}</p></div>
                      <div><p className="font-semibold text-gray-700">CNPJ:</p><p>{workshop.cnpj || 'Não informado'}</p></div>
                      <div><p className="font-semibold text-gray-700 flex items-center gap-1"><MapPin className="w-4 h-4" />Localização:</p><p>{workshop.city} / {workshop.state}</p></div>
                      <div><p className="font-semibold text-gray-700 flex items-center gap-1"><Award className="w-4 h-4" />Plano:</p><p>{workshop.planoAtual || 'FREE'}</p></div>
                      {workshop.segment_auto && <div><p className="font-semibold text-gray-700">Segmento:</p><p>{workshop.segment_auto}</p></div>}
                      {workshop.employees_count && <div><p className="font-semibold text-gray-700">Funcionários:</p><p>{workshop.employees_count}</p></div>}
                    </div>
                    </CardContent>
                    </Card>
                    )}

                    {/* FIXED FOOTER - Aparece em todas as páginas */}
                    <div className="document-footer">
                    <p>© 2026 Oficinas Master • {d.code || 'ATA'} • {d.meeting_date ? new Date(d.meeting_date).toLocaleDateString('pt-BR') : ''}</p>
                    <p>Documento gerado automaticamente pela Plataforma de Aceleração de Oficinas</p>
                    </div>
                    </div>
                    </div>
                  )}

                {/* FOOTER - FIXO */}
                <div className="flex justify-end px-6 py-4 border-t print:hidden gap-2 flex-shrink-0 bg-white">
                <Button variant="outline" onClick={onClose}>Fechar</Button>
                </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ─── Sub-components ─── */

function SectionTitle({ num, title, subtitle }) {
  return (
    <h3 className="font-bold text-lg mb-3 flex items-center gap-2 flex-wrap">
      {num}. {title}
      {subtitle && <Badge variant="outline" className="bg-gray-50 text-gray-500 font-normal">{subtitle}</Badge>}
    </h3>
  );
}

function SectionCard({ num, title, subtitle, content, items, renderItems }) {
  const hasContent = content || (Array.isArray(items) && items.length > 0);
  if (!hasContent) return null;
  return (
    <Card>
      <CardContent className="pt-6">
        <SectionTitle num={num} title={title} subtitle={subtitle} />
        {content ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          renderItems && renderItems(items)
        )}
      </CardContent>
    </Card>
  );
}

function MidiaItem({ midia, index }) {
  const tipoIcons = { imagem: '🖼️', video: '🎬', link: '🔗', documento: '📄' };
  const icon = tipoIcons[midia.tipo] || '📎';
  return (
    <div className="space-y-2">
      <p className="font-medium text-sm">{icon} {midia.titulo || `${midia.tipo || 'Anexo'} ${index + 1}`}</p>
      {midia.tipo === 'imagem' && midia.url && (
        <img src={midia.url} alt={midia.titulo || 'Imagem'} className="max-w-full h-auto rounded border" />
      )}
      {midia.tipo === 'link' && midia.url && (
        <a href={midia.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 break-all hover:underline">{midia.url}</a>
      )}
      {(midia.tipo === 'video' || midia.tipo === 'documento') && midia.url && (
        <p className="text-xs text-gray-600 break-all">{midia.url}</p>
      )}
    </div>
  );
}