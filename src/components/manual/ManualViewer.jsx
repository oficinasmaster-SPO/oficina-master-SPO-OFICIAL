import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, X, Building2, Users, Target, FileText, BookOpen, Shield, ChevronDown, ChevronUp } from "lucide-react";
import ManualPDFGenerator from "./ManualPDFGenerator";
import ITViewer from "@/components/processes/ITViewer";
import ProcessViewer from "./ProcessViewer";

export default function ManualViewer({ data, onClose }) {
  const { cultura, processos, instructionDocs, cargos, areas, workshop } = data;
  const [expandedProcessos, setExpandedProcessos] = useState({});

  // Expandir todos os processos e ITs por padrão ao abrir
  React.useEffect(() => {
    const allIds = {};
    processos.forEach(p => allIds[p.id] = true);
    instructionDocs.forEach(it => allIds[it.id] = true);
    setExpandedProcessos(allIds);
  }, [processos, instructionDocs]);

  const toggleProcesso = (id) => {
    setExpandedProcessos(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Agrupar processos por área
  const processosPorArea = {};
  
  // Processos e ITs com área definida
  areas.forEach(area => {
    const processosArea = processos.filter(p => p.area_id === area.id);
    const itsArea = instructionDocs.filter(it => it.area_id === area.id);
    
    if (processosArea.length > 0 || itsArea.length > 0) {
      processosPorArea[area.id] = {
        area,
        processos: processosArea,
        its: itsArea
      };
    }
  });
  
  // Processos e ITs sem área definida (null ou undefined)
  const processosSemArea = processos.filter(p => !p.area_id);
  const itsSemArea = instructionDocs.filter(it => !it.area_id);
  
  if (processosSemArea.length > 0 || itsSemArea.length > 0) {
    processosPorArea['sem_area'] = {
      area: { 
        id: 'sem_area', 
        name: 'Processos Gerais', 
        color: '#6B7280',
        description: 'Processos e procedimentos não vinculados a uma área específica'
      },
      processos: processosSemArea,
      its: itsSemArea
    };
  }

  const handleDownloadPDF = () => {
    ManualPDFGenerator.generate(data);
  };

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
      <div className="max-w-[210mm] mx-auto p-8 space-y-6">
        {/* Header Fixo */}
        <div className="sticky top-0 bg-white border-b pb-4 z-10 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manual de Processos e Procedimentos</h1>
            <p className="text-gray-600">{workshop?.name}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleDownloadPDF} className="bg-blue-600 hover:bg-blue-700">
              <Download className="w-4 h-4 mr-2" />
              Baixar PDF
            </Button>
            <Button variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              Fechar
            </Button>
          </div>
        </div>

        {/* 1. APRESENTAÇÃO INSTITUCIONAL */}
        <Card className="shadow-lg print-section">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
            <CardTitle className="text-2xl flex items-center gap-2">
              <Building2 className="w-6 h-6" />
              1. Apresentação Institucional
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div>
              <h3 className="font-bold text-lg text-gray-900 mb-2">Quem Somos</h3>
              <p className="text-gray-700">{workshop?.name || "Oficina"}</p>
              <p className="text-sm text-gray-600 mt-1">
                {workshop?.segment_auto || workshop?.segment || "Segmento automotivo"}
              </p>
            </div>

            {cultura && (
              <>
                {cultura.mission_statement && (
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 mb-2">Missão</h3>
                    <p className="text-gray-700 section-content">{cultura.mission_statement}</p>
                  </div>
                )}

                {cultura.vision_statement && (
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 mb-2">Visão</h3>
                    <p className="text-gray-700 section-content">{cultura.vision_statement}</p>
                  </div>
                )}

                {cultura.core_values && cultura.core_values.length > 0 && (
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 mb-2">Valores</h3>
                    <div className="space-y-2">
                      {cultura.core_values.map((value, idx) => (
                        <div key={idx} className="bg-blue-50 p-3 rounded-lg">
                          <p className="font-semibold text-blue-900">{value.name}</p>
                          <p className="text-sm text-gray-700 mt-1">{value.definition}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* 2. ESTRUTURA ORGANIZACIONAL */}
        <Card className="shadow-lg print-section page-break-before">
          <CardHeader className="bg-gradient-to-r from-green-600 to-teal-600 text-white p-6">
            <CardTitle className="text-2xl flex items-center gap-2">
              <Users className="w-6 h-6" />
              2. Estrutura Organizacional
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700">
                <strong>Total de Colaboradores:</strong> {workshop?.employees_count || 1}
              </p>
              <p className="text-gray-700 mt-2">
                <strong>Áreas Ativas:</strong> {areas.filter(a => !a.workshop_id || a.workshop_id === workshop?.id).length}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 3. ÁREAS DA EMPRESA */}
        <Card className="shadow-lg print-section">
          <CardHeader className="bg-gradient-to-r from-orange-600 to-red-600 text-white p-6">
            <CardTitle className="text-2xl flex items-center gap-2">
              <Target className="w-6 h-6" />
              3. Áreas da Empresa (Visão Macro)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div>
              <h3 className="section-title">Áreas Gerais</h3>
              <div className="grid grid-cols-2 gap-2">
                {areas.filter(a => a.category === 'geral').map(area => (
                  <Badge key={area.id} variant="outline" style={{ borderColor: area.color }}>
                    {area.name}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h3 className="section-title">Áreas Técnicas</h3>
              <div className="grid grid-cols-2 gap-2">
                {areas.filter(a => a.category === 'tecnica').map(area => (
                  <Badge key={area.id} variant="outline" style={{ borderColor: area.color }}>
                    {area.name}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 4. PROCESSOS POR ÁREA */}
        <Card className="shadow-lg print-section page-break-before">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6">
            <CardTitle className="text-2xl flex items-center gap-2">
              <FileText className="w-6 h-6" />
              4. Processos por Área
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {areas.map(area => {
              const areaData = processosPorArea[area.id];
              if (!areaData || (areaData.processos.length === 0 && areaData.its.length === 0)) return null;

              return (
                <div key={area.id} className="page-break-inside-avoid">
                  <div className="subsection-title" style={{ borderColor: area.color, color: area.color }}>
                    {area.name}
                  </div>

                  {areaData.processos.length > 0 && (
                    <div className="mb-6 space-y-4">
                      <p className="font-semibold text-gray-900 mb-3">MAPs (Mapas de Processos)</p>
                      {areaData.processos.map(proc => (
                        <div key={proc.id} className="border rounded-lg overflow-hidden page-break-inside-avoid">
                          <div 
                            className="bg-gray-50 p-4 flex items-center justify-between cursor-pointer hover:bg-gray-100 print:bg-white"
                            onClick={() => toggleProcesso(proc.id)}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <span className="font-mono text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{proc.code}</span>
                                <h4 className="font-bold text-gray-900">{proc.title}</h4>
                              </div>
                              {proc.description && (
                                <p className="text-sm text-gray-600 mt-1">{proc.description}</p>
                              )}
                            </div>
                            <Button variant="ghost" size="sm" className="print:hidden">
                              {expandedProcessos[proc.id] ? (
                                <ChevronUp className="w-5 h-5" />
                              ) : (
                                <ChevronDown className="w-5 h-5" />
                              )}
                            </Button>
                          </div>
                          {expandedProcessos[proc.id] && (
                            <div className="p-6 bg-white border-t">
                              <ProcessViewer processo={proc} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {areaData.its.length > 0 && (
                    <div className="space-y-4">
                      <p className="font-semibold text-gray-900 mb-3">ITs e FRs (Instruções e Formulários)</p>
                      {areaData.its.map(it => (
                        <div key={it.id} className="border rounded-lg overflow-hidden page-break-inside-avoid">
                          <div 
                            className="bg-gray-50 p-4 flex items-center justify-between cursor-pointer hover:bg-gray-100 print:bg-white"
                            onClick={() => toggleProcesso(it.id)}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <Badge variant={it.type === 'IT' ? 'default' : 'secondary'}>
                                  {it.type}
                                </Badge>
                                <h4 className="font-bold text-gray-900">{it.title}</h4>
                              </div>
                              {it.description && (
                                <p className="text-sm text-gray-600 mt-1">{it.description}</p>
                              )}
                            </div>
                            <Button variant="ghost" size="sm" className="print:hidden">
                              {expandedProcessos[it.id] ? (
                                <ChevronUp className="w-5 h-5" />
                              ) : (
                                <ChevronDown className="w-5 h-5" />
                              )}
                            </Button>
                          </div>
                          {expandedProcessos[it.id] && (
                            <div className="border-t">
                              <ITViewer it={it} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* 5. FUNÇÕES E DESCRIÇÕES DE CARGO */}
        {cargos.length > 0 && (
          <Card className="shadow-lg print-section page-break-before">
            <CardHeader className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-6">
              <CardTitle className="text-2xl flex items-center gap-2">
                <BookOpen className="w-6 h-6" />
                5. Funções e Descrições de Cargo
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {cargos.map(cargo => (
                <div key={cargo.id} className="page-break-inside-avoid border-l-4 border-indigo-500 pl-4 py-2">
                  <h3 className="font-bold text-lg text-gray-900">{cargo.title}</h3>
                  {cargo.description && (
                    <p className="text-sm text-gray-700 mt-2 section-content">{cargo.description}</p>
                  )}
                  {cargo.responsibilities && cargo.responsibilities.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-semibold text-gray-800">Responsabilidades:</p>
                      <ul className="list-disc list-inside text-sm text-gray-700 mt-1">
                        {cargo.responsibilities.map((resp, idx) => (
                          <li key={idx}>{resp}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* 6. INDICADORES E METAS */}
        <Card className="shadow-lg print-section page-break-before">
          <CardHeader className="bg-gradient-to-r from-yellow-600 to-orange-600 text-white p-6">
            <CardTitle className="text-2xl flex items-center gap-2">
              <Target className="w-6 h-6" />
              6. Indicadores e Metas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {workshop?.monthly_goals ? (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-semibold text-gray-900">Meta de Faturamento Mensal</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  R$ {(workshop.monthly_goals.projected_revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            ) : (
              <p className="text-gray-600">Configure as metas em Cadastros → Gestão da Oficina</p>
            )}
          </CardContent>
        </Card>

        {/* 7. REGRAS GERAIS */}
        <Card className="shadow-lg print-section page-break-before">
          <CardHeader className="bg-gradient-to-r from-red-600 to-pink-600 text-white p-6">
            <CardTitle className="text-2xl flex items-center gap-2">
              <Shield className="w-6 h-6" />
              7. Regras Gerais e Compliance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-gray-700 section-content">
              Todos os colaboradores devem seguir os processos e procedimentos definidos neste manual, 
              garantindo qualidade, segurança e eficiência operacional.
            </p>
          </CardContent>
        </Card>

        {/* Footer com informações de controle */}
        <div className="print-footer text-center border-t pt-4 mt-8">
          <p className="text-xs text-gray-600">
            Manual de Processos e Procedimentos - {workshop?.name}
          </p>
          <p className="text-xs text-gray-500">
            Gerado em {new Date().toLocaleDateString('pt-BR')} via Oficinas Master
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Documento confidencial de propriedade da empresa
          </p>
        </div>
      </div>
    </div>
  );
}