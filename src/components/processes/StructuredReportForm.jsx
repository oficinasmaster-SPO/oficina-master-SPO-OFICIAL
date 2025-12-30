import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Loader2, FileText, CheckCircle2 } from "lucide-react";
import { generateStructuredReportPDF } from "./StructuredReportPDF";
import { toast } from "sonner";

export default function StructuredReportForm({ open, onClose, onSave, workshop }) {
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  const [formData, setFormData] = useState({
    // Informações Iniciais
    empresa: workshop?.name || "",
    unidade_area: "",
    data: new Date().toISOString().split('T')[0],
    horario_inicio: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    horario_termino: "",
    local: "",
    normas_om: [],
    norma_outra: "",
    
    // Participantes
    participantes: [],
    
    // Objetivo
    objetivo_consultoria: "",
    
    // Escopo
    escopo_processos: "",
    escopo_areas: "",
    escopo_responsaveis: "",
    
    // Atividades
    atividades: {
      entrevistas: false,
      analise_documental: false,
      observacao_in_loco: false,
      mapeamento_processos: false,
      avaliacao_indicadores: false,
      outro: false
    },
    atividade_outro_texto: "",
    
    // Diagnóstico
    pontos_conformes: "",
    nao_conformidades: [],
    
    // Oportunidades
    oportunidades_melhoria: "",
    
    // Plano de Ação
    plano_acao: [],
    
    // Evidências
    evidencias_apresentadas: "",
    
    // Conclusão
    conclusao: "",
    
    // Próxima Etapa
    proxima_etapa_data: "",
    proxima_etapa_objetivo: "",
    
    // Observações
    observacoes_gerais: "",
    
    // Assinaturas
    consultor_nome: "",
    consultor_cargo: "",
    representante_nome: "",
    representante_cargo: "",
    
    // Maturidade
    nivel_maturidade: 0
  });

  const normasOM = [
    { id: "OM-M01", label: "OM-M01 - Gestão Estratégica" },
    { id: "OM-M02", label: "OM-M02 - Gestão Comercial" },
    { id: "OM-M03", label: "OM-M03 - Gestão de Pessoas" },
    { id: "OM-M04", label: "OM-M04 - Gestão Operacional" },
    { id: "OM-M05", label: "OM-M05 - Gestão Financeira" },
    { id: "OM-M06", label: "OM-M06 - Melhoria Contínua" }
  ];

  const maturidadeLevels = [
    { nivel: 0, label: "Inexistente", icon: "❌", desc: "Processo não existe" },
    { nivel: 1, label: "Inicial", icon: "⚠️", desc: "Processo existe mas não documentado" },
    { nivel: 2, label: "Documentado", icon: "📄", desc: "Processo documentado mas não implementado" },
    { nivel: 3, label: "Implementado", icon: "✔️", desc: "Processo em uso parcial" },
    { nivel: 4, label: "Gerenciado", icon: "✔️✔️", desc: "Processo totalmente implementado" },
    { nivel: 5, label: "Otimizado", icon: "⭐", desc: "Processo auditado e melhorado continuamente" }
  ];

  const addParticipante = () => {
    setFormData({
      ...formData,
      participantes: [...formData.participantes, { nome: "", cargo: "", empresa: "", email: "" }]
    });
  };

  const removeParticipante = (idx) => {
    const updated = formData.participantes.filter((_, i) => i !== idx);
    setFormData({ ...formData, participantes: updated });
  };

  const updateParticipante = (idx, field, value) => {
    const updated = [...formData.participantes];
    updated[idx][field] = value;
    setFormData({ ...formData, participantes: updated });
  };

  const addNaoConformidade = () => {
    setFormData({
      ...formData,
      nao_conformidades: [...formData.nao_conformidades, { numero: formData.nao_conformidades.length + 1, descricao: "", requisito_om: "", evidencia: "" }]
    });
  };

  const removeNaoConformidade = (idx) => {
    const updated = formData.nao_conformidades.filter((_, i) => i !== idx);
    setFormData({ ...formData, nao_conformidades: updated });
  };

  const updateNaoConformidade = (idx, field, value) => {
    const updated = [...formData.nao_conformidades];
    updated[idx][field] = value;
    setFormData({ ...formData, nao_conformidades: updated });
  };

  const addAcao = () => {
    setFormData({
      ...formData,
      plano_acao: [...formData.plano_acao, { numero: formData.plano_acao.length + 1, acao: "", responsavel: "", prazo: "", status: "Pendente" }]
    });
  };

  const removeAcao = (idx) => {
    const updated = formData.plano_acao.filter((_, i) => i !== idx);
    setFormData({ ...formData, plano_acao: updated });
  };

  const updateAcao = (idx, field, value) => {
    const updated = [...formData.plano_acao];
    updated[idx][field] = value;
    setFormData({ ...formData, plano_acao: updated });
  };

  const handleGeneratePDF = async () => {
    console.log("🔵 Iniciando geração do relatório...");
    setLoading(true);
    
    try {
      const horario_termino = formData.horario_termino || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const dataCompleta = { ...formData, horario_termino };
      
      console.log("📄 Dados do formulário:", dataCompleta);
      console.log("🏢 Workshop:", workshop);
      
      toast.info("Gerando PDF...", { duration: 5000 });
      
      console.log("📋 Chamando generateStructuredReportPDF...");
      const result = await generateStructuredReportPDF(dataCompleta, workshop);
      console.log("✅ PDF gerado, resultado:", result);
      
      if (!result) {
        throw new Error("Falha ao gerar PDF");
      }
      
      // Modo download local (limite atingido) - não salva evidência
      if (result.downloadMode) {
        toast.success("✅ PDF gerado e baixado no seu computador!", {
          duration: 5000
        });
        onClose();
        return;
      }
      
      // Modo normal (upload bem-sucedido)
      const reportData = {
        type: 'relatorio_implementacao',
        title: `Relatório de Implementação - ${formData.unidade_area || 'Geral'}`,
        file_url: result.file_url,
        data: dataCompleta
      };
      
      console.log("💾 Salvando evidência:", reportData);
      await onSave(reportData);
      console.log("✅ Evidência salva com sucesso");
      
      toast.success("Relatório gerado e salvo com sucesso!");
      onClose();
      
    } catch (error) {
      console.error("❌ Erro ao gerar relatório:", error.message);
      toast.error("Erro: " + (error.message || "Falha ao gerar relatório"), {
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  const totalSteps = 7;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Relatório de Implementação Estruturada
          </DialogTitle>
          <div className="flex items-center gap-2 mt-3">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              />
            </div>
            <span className="text-sm text-gray-600">{currentStep}/{totalSteps}</span>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>1. Informações Iniciais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Empresa</Label>
                    <Input value={formData.empresa} onChange={(e) => setFormData({ ...formData, empresa: e.target.value })} />
                  </div>
                  <div>
                    <Label>Unidade/Área</Label>
                    <Input value={formData.unidade_area} onChange={(e) => setFormData({ ...formData, unidade_area: e.target.value })} />
                  </div>
                  <div>
                    <Label>Data</Label>
                    <Input type="date" value={formData.data} onChange={(e) => setFormData({ ...formData, data: e.target.value })} />
                  </div>
                  <div>
                    <Label>Local</Label>
                    <Input value={formData.local} onChange={(e) => setFormData({ ...formData, local: e.target.value })} />
                  </div>
                  <div>
                    <Label>Horário Início</Label>
                    <Input type="time" value={formData.horario_inicio} onChange={(e) => setFormData({ ...formData, horario_inicio: e.target.value })} />
                  </div>
                  <div>
                    <Label>Horário Término</Label>
                    <Input type="time" value={formData.horario_termino} onChange={(e) => setFormData({ ...formData, horario_termino: e.target.value })} />
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block">Normas OM Aplicáveis</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {normasOM.map(norma => (
                      <div key={norma.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={formData.normas_om.includes(norma.id)}
                          onCheckedChange={(checked) => {
                            const updated = checked
                              ? [...formData.normas_om, norma.id]
                              : formData.normas_om.filter(n => n !== norma.id);
                            setFormData({ ...formData, normas_om: updated });
                          }}
                        />
                        <label className="text-sm">{norma.label}</label>
                      </div>
                    ))}
                  </div>
                  <Input
                    placeholder="Outra norma"
                    value={formData.norma_outra}
                    onChange={(e) => setFormData({ ...formData, norma_outra: e.target.value })}
                    className="mt-2"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  2. Participantes
                  <Button size="sm" onClick={addParticipante}>
                    <Plus className="w-4 h-4 mr-1" /> Adicionar
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {formData.participantes.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">Nenhum participante adicionado</p>
                ) : (
                  <div className="space-y-3">
                    {formData.participantes.map((p, idx) => (
                      <div key={idx} className="border rounded-lg p-3 space-y-2">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-semibold">Participante {idx + 1}</span>
                          <Button size="sm" variant="ghost" onClick={() => removeParticipante(idx)}>
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Input placeholder="Nome" value={p.nome} onChange={(e) => updateParticipante(idx, 'nome', e.target.value)} />
                          <Input placeholder="Cargo" value={p.cargo} onChange={(e) => updateParticipante(idx, 'cargo', e.target.value)} />
                          <Input placeholder="Empresa" value={p.empresa} onChange={(e) => updateParticipante(idx, 'empresa', e.target.value)} />
                          <Input placeholder="E-mail" value={p.email} onChange={(e) => updateParticipante(idx, 'email', e.target.value)} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>3. Objetivo e Escopo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Objetivo da Consultoria</Label>
                  <Textarea rows={3} value={formData.objetivo_consultoria} onChange={(e) => setFormData({ ...formData, objetivo_consultoria: e.target.value })} />
                </div>
                <div>
                  <Label>Processo(s) Avaliado(s)</Label>
                  <Input value={formData.escopo_processos} onChange={(e) => setFormData({ ...formData, escopo_processos: e.target.value })} />
                </div>
                <div>
                  <Label>Área(s)</Label>
                  <Input value={formData.escopo_areas} onChange={(e) => setFormData({ ...formData, escopo_areas: e.target.value })} />
                </div>
                <div>
                  <Label>Responsável(is)</Label>
                  <Input value={formData.escopo_responsaveis} onChange={(e) => setFormData({ ...formData, escopo_responsaveis: e.target.value })} />
                </div>

                <div>
                  <Label className="mb-2 block">Atividades Realizadas</Label>
                  <div className="space-y-2">
                    {[
                      { key: 'entrevistas', label: 'Entrevistas com responsáveis' },
                      { key: 'analise_documental', label: 'Análise documental' },
                      { key: 'observacao_in_loco', label: 'Observação in loco' },
                      { key: 'mapeamento_processos', label: 'Mapeamento de processos' },
                      { key: 'avaliacao_indicadores', label: 'Avaliação de indicadores' },
                      { key: 'outro', label: 'Outro' }
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-2">
                        <Checkbox
                          checked={formData.atividades[key]}
                          onCheckedChange={(checked) => setFormData({
                            ...formData,
                            atividades: { ...formData.atividades, [key]: checked }
                          })}
                        />
                        <label className="text-sm">{label}</label>
                      </div>
                    ))}
                  </div>
                  {formData.atividades.outro && (
                    <Input
                      placeholder="Descreva outra atividade"
                      value={formData.atividade_outro_texto}
                      onChange={(e) => setFormData({ ...formData, atividade_outro_texto: e.target.value })}
                      className="mt-2"
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 4 && (
            <Card>
              <CardHeader>
                <CardTitle>4. Diagnóstico</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Pontos Conformes</Label>
                  <Textarea rows={4} value={formData.pontos_conformes} onChange={(e) => setFormData({ ...formData, pontos_conformes: e.target.value })} />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label>Não Conformidades / Lacunas</Label>
                    <Button size="sm" onClick={addNaoConformidade}>
                      <Plus className="w-4 h-4 mr-1" /> Adicionar
                    </Button>
                  </div>
                  {formData.nao_conformidades.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">Nº</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Requisito OM</TableHead>
                          <TableHead>Evidência</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {formData.nao_conformidades.map((nc, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{nc.numero}</TableCell>
                            <TableCell>
                              <Textarea rows={2} value={nc.descricao} onChange={(e) => updateNaoConformidade(idx, 'descricao', e.target.value)} />
                            </TableCell>
                            <TableCell>
                              <Input value={nc.requisito_om} onChange={(e) => updateNaoConformidade(idx, 'requisito_om', e.target.value)} />
                            </TableCell>
                            <TableCell>
                              <Input value={nc.evidencia} onChange={(e) => updateNaoConformidade(idx, 'evidencia', e.target.value)} />
                            </TableCell>
                            <TableCell>
                              <Button size="sm" variant="ghost" onClick={() => removeNaoConformidade(idx)}>
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>

                <div>
                  <Label>Oportunidades de Melhoria</Label>
                  <Textarea rows={4} value={formData.oportunidades_melhoria} onChange={(e) => setFormData({ ...formData, oportunidades_melhoria: e.target.value })} />
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 5 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  5. Plano de Ação
                  <Button size="sm" onClick={addAcao}>
                    <Plus className="w-4 h-4 mr-1" /> Adicionar
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {formData.plano_acao.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Nº</TableHead>
                        <TableHead>Ação</TableHead>
                        <TableHead>Responsável</TableHead>
                        <TableHead>Prazo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formData.plano_acao.map((acao, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{acao.numero}</TableCell>
                          <TableCell>
                            <Textarea rows={2} value={acao.acao} onChange={(e) => updateAcao(idx, 'acao', e.target.value)} />
                          </TableCell>
                          <TableCell>
                            <Input value={acao.responsavel} onChange={(e) => updateAcao(idx, 'responsavel', e.target.value)} />
                          </TableCell>
                          <TableCell>
                            <Input type="date" value={acao.prazo} onChange={(e) => updateAcao(idx, 'prazo', e.target.value)} />
                          </TableCell>
                          <TableCell>
                            <Select value={acao.status} onValueChange={(val) => updateAcao(idx, 'status', val)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Pendente">Pendente</SelectItem>
                                <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                                <SelectItem value="Concluído">Concluído</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost" onClick={() => removeAcao(idx)}>
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}

          {currentStep === 6 && (
            <Card>
              <CardHeader>
                <CardTitle>6. Conclusão e Próximos Passos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Evidências Apresentadas</Label>
                  <Textarea rows={3} value={formData.evidencias_apresentadas} onChange={(e) => setFormData({ ...formData, evidencias_apresentadas: e.target.value })} placeholder="Liste os documentos e evidências apresentados" />
                </div>
                <div>
                  <Label>Conclusão</Label>
                  <Textarea rows={4} value={formData.conclusao} onChange={(e) => setFormData({ ...formData, conclusao: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Próxima Etapa - Data Prevista</Label>
                    <Input type="date" value={formData.proxima_etapa_data} onChange={(e) => setFormData({ ...formData, proxima_etapa_data: e.target.value })} />
                  </div>
                  <div>
                    <Label>Próxima Etapa - Objetivo</Label>
                    <Input value={formData.proxima_etapa_objetivo} onChange={(e) => setFormData({ ...formData, proxima_etapa_objetivo: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Observações Gerais</Label>
                  <Textarea rows={3} value={formData.observacoes_gerais} onChange={(e) => setFormData({ ...formData, observacoes_gerais: e.target.value })} />
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 7 && (
            <Card>
              <CardHeader>
                <CardTitle>7. Assinaturas e Maturidade</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nome do Consultor</Label>
                    <Input value={formData.consultor_nome} onChange={(e) => setFormData({ ...formData, consultor_nome: e.target.value })} />
                  </div>
                  <div>
                    <Label>Cargo do Consultor</Label>
                    <Input value={formData.consultor_cargo} onChange={(e) => setFormData({ ...formData, consultor_cargo: e.target.value })} />
                  </div>
                  <div>
                    <Label>Nome do Representante</Label>
                    <Input value={formData.representante_nome} onChange={(e) => setFormData({ ...formData, representante_nome: e.target.value })} />
                  </div>
                  <div>
                    <Label>Cargo do Representante</Label>
                    <Input value={formData.representante_cargo} onChange={(e) => setFormData({ ...formData, representante_cargo: e.target.value })} />
                  </div>
                </div>

                <div>
                  <Label className="mb-3 block">Nível de Maturidade do Processo</Label>
                  <div className="space-y-2">
                    {maturidadeLevels.map(level => (
                      <div
                        key={level.nivel}
                        onClick={() => setFormData({ ...formData, nivel_maturidade: level.nivel })}
                        className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                          formData.nivel_maturidade === level.nivel
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{level.icon}</span>
                          <div>
                            <div className="font-semibold">Nível {level.nivel} - {level.label}</div>
                            <div className="text-sm text-gray-600">{level.desc}</div>
                          </div>
                          {formData.nivel_maturidade === level.nivel && (
                            <CheckCircle2 className="w-5 h-5 text-blue-600 ml-auto" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => {
              console.log("⬅️ Botão Anterior clicado");
              setCurrentStep(Math.max(1, currentStep - 1));
            }}
            disabled={currentStep === 1}
          >
            Anterior
          </Button>
          
          {currentStep < totalSteps ? (
            <Button onClick={() => {
              console.log("➡️ Botão Próximo clicado");
              setCurrentStep(Math.min(totalSteps, currentStep + 1));
            }}>
              Próximo
            </Button>
          ) : (
            <Button 
              onClick={(e) => {
                console.log("🔘 Botão Gerar Relatório CLICADO!");
                console.log("🔘 Event:", e);
                console.log("🔘 Loading atual:", loading);
                e.preventDefault();
                e.stopPropagation();
                handleGeneratePDF();
              }} 
              disabled={loading} 
              className="bg-blue-600 hover:bg-blue-700"
              type="button"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando PDF...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Gerar Relatório
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}