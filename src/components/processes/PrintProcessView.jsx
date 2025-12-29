import React from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileCheck, AlertTriangle } from "lucide-react";

export default function PrintProcessView({ processDoc, its = [], workshop }) {
  const content = processDoc?.content_json || {};

  return (
    <div className="print-container">
      {/* Cabeçalho Institucional */}
      <header className="print-header">
        <div className="flex items-center justify-between border-b-4 border-red-600 pb-4 mb-6">
          <div className="flex items-center gap-4">
            {workshop?.logo_url ? (
              <img src={workshop.logo_url} alt="Logo" className="h-16 w-16 object-contain" />
            ) : (
              <div className="h-16 w-16 bg-red-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                OM
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 uppercase">
                Mapa da Auto Gestão do Processo
              </h1>
              <p className="text-lg text-gray-700">{processDoc.title}</p>
            </div>
          </div>
          <div className="text-right text-sm">
            <p><strong>Código:</strong> {processDoc.code || "N/A"}</p>
            <p><strong>Versão:</strong> {processDoc.revision || "1"}</p>
            <p><strong>Data:</strong> {new Date(processDoc.updated_date || processDoc.created_date).toLocaleDateString('pt-BR')}</p>
            <Badge variant="outline" className="mt-1">{processDoc.category}</Badge>
            <Badge className="mt-1 ml-2">
              {processDoc.status === 'ativo' ? 'Ativo' : processDoc.status === 'obsoleto' ? 'Obsoleto' : 'Em Revisão'}
            </Badge>
          </div>
        </div>
      </header>

      {/* Conteúdo do MAP */}
      <section className="mb-8">
        <div className="space-y-6">
          {/* 1. Objetivo */}
          <div className="print-section">
            <h3 className="section-title">1. Objetivo</h3>
            <p className="section-content">{content.objetivo || "Não definido."}</p>
          </div>

          {/* 2. Campo de Aplicação */}
          <div className="print-section">
            <h3 className="section-title">2. Campo de Aplicação</h3>
            <p className="section-content">{content.campo_aplicacao || "Não definido."}</p>
          </div>

          {/* 3. Informações Complementares */}
          {content.informacoes_complementares && (
            <div className="print-section">
              <h3 className="section-title">3. Informações Complementares</h3>
              <p className="section-content">{content.informacoes_complementares}</p>
            </div>
          )}

          {/* 4. Fluxo do Processo */}
          <div className="print-section">
            <h3 className="section-title">4. Fluxo do Processo</h3>
            {content.fluxo_processo && (
              <p className="section-content mb-3">{content.fluxo_processo}</p>
            )}
            {content.fluxo_image_url && (
              <div className="flex justify-center my-4">
                <img 
                  src={content.fluxo_image_url} 
                  alt="Fluxograma" 
                  className="max-w-full max-h-96 object-contain border rounded"
                />
              </div>
            )}
          </div>

          {/* 5. Atividades */}
          {content.atividades && content.atividades.length > 0 && (
            <div className="print-section page-break-inside-avoid">
              <h3 className="section-title">5. Atividades e Responsabilidades</h3>
              <Table className="print-table">
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Atividade</TableHead>
                    <TableHead className="font-bold">Responsável</TableHead>
                    <TableHead className="font-bold">Ferramentas/Docs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {content.atividades.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{item.atividade}</TableCell>
                      <TableCell>{item.responsavel}</TableCell>
                      <TableCell>{item.ferramentas}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* 6. Matriz de Riscos */}
          {content.matriz_riscos && content.matriz_riscos.length > 0 && (
            <div className="print-section page-break-inside-avoid">
              <h3 className="section-title">6. Matriz de Riscos</h3>
              <Table className="print-table">
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Risco</TableHead>
                    <TableHead className="font-bold">Fonte</TableHead>
                    <TableHead className="font-bold">Impacto</TableHead>
                    <TableHead className="font-bold">Categoria</TableHead>
                    <TableHead className="font-bold">Controle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {content.matriz_riscos.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{item.identificacao}</TableCell>
                      <TableCell>{item.fonte}</TableCell>
                      <TableCell>{item.impacto}</TableCell>
                      <TableCell>
                        <Badge variant={item.categoria === 'Alto' ? 'destructive' : 'outline'}>
                          {item.categoria}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.controle}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* 7. Inter-relações */}
          {content.inter_relacoes && content.inter_relacoes.length > 0 && (
            <div className="print-section page-break-inside-avoid">
              <h3 className="section-title">7. Inter-relação entre Áreas</h3>
              <Table className="print-table">
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold w-1/3">Área</TableHead>
                    <TableHead className="font-bold">Interação</TableHead>
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
            </div>
          )}

          {/* 8. Indicadores */}
          {content.indicadores && content.indicadores.length > 0 && (
            <div className="print-section page-break-inside-avoid">
              <h3 className="section-title">8. Indicadores de Desempenho</h3>
              <Table className="print-table">
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Indicador</TableHead>
                    <TableHead className="font-bold">Meta</TableHead>
                    <TableHead className="font-bold">Como Medir</TableHead>
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
            </div>
          )}
        </div>
      </section>

      {/* Rodapé do MAP */}
      <footer className="print-footer text-center text-xs text-gray-500 border-t pt-3 mt-6">
        <p>Documento Controlado - {processDoc.operational_status || 'Em elaboração'}</p>
        <p>Oficinas Master - Impresso em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</p>
      </footer>

      {/* ITs/FRs Vinculadas */}
      {its && its.length > 0 && (
        <div className="print-its-section">
          {its.map((it, idx) => (
            <div key={it.id} className="page-break-before">
              <PrintITView it={it} index={idx + 1} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PrintITView({ it, index }) {
  const content = it?.content || {};

  return (
    <div className="print-it-container">
      {/* Cabeçalho IT */}
      <header className="print-it-header border-b-2 border-gray-800 pb-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-12 w-12 rounded-lg flex items-center justify-center text-white font-bold ${
              it.type === 'IT' ? 'bg-green-600' : 'bg-orange-600'
            }`}>
              {it.type}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{it.title}</h2>
              <p className="text-sm text-gray-600">{it.description || "Sem descrição"}</p>
            </div>
          </div>
          <div className="text-right text-sm">
            <p><strong>Código:</strong> {it.code}</p>
            <p><strong>Versão:</strong> {it.version || "1"}</p>
            <Badge className="mt-1">{it.status || "ativo"}</Badge>
          </div>
        </div>
      </header>

      <div className="space-y-6">
        {/* 1. Objetivo */}
        <div className="print-section">
          <h4 className="subsection-title">1. Objetivo</h4>
          <p className="section-content">{content.objetivo || "Não definido."}</p>
        </div>

        {/* 2. Campo de Aplicação */}
        <div className="print-section">
          <h4 className="subsection-title">2. Campo de Aplicação</h4>
          <p className="section-content">{content.campo_aplicacao || "Não definido."}</p>
        </div>

        {/* 3. Informações Complementares */}
        {content.informacoes_complementares && (
          <div className="print-section">
            <h4 className="subsection-title">3. Informações Complementares</h4>
            <p className="section-content">{content.informacoes_complementares}</p>
          </div>
        )}

        {/* 4. Fluxo */}
        <div className="print-section">
          <h4 className="subsection-title">4. Fluxo de Execução</h4>
          {content.fluxo_descricao && (
            <p className="section-content mb-3">{content.fluxo_descricao}</p>
          )}
          {content.fluxo_image_url && (
            <div className="flex justify-center my-3">
              <img 
                src={content.fluxo_image_url} 
                alt="Fluxograma IT" 
                className="max-w-full max-h-64 object-contain border rounded" 
              />
            </div>
          )}
        </div>

        {/* 5. Atividades */}
        {content.atividades && content.atividades.length > 0 && (
          <div className="print-section page-break-inside-avoid">
            <h4 className="subsection-title">5. Atividades e Responsabilidades</h4>
            <Table className="print-table">
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold">Atividade</TableHead>
                  <TableHead className="font-bold">Responsável</TableHead>
                  <TableHead className="font-bold">Frequência</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {content.atividades.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{item.atividade}</TableCell>
                    <TableCell>{item.responsavel}</TableCell>
                    <TableCell>{item.frequencia}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* 6. Riscos */}
        {content.matriz_riscos && content.matriz_riscos.filter(r => r.risco).length > 0 && (
          <div className="print-section page-break-inside-avoid">
            <h4 className="subsection-title flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              6. Matriz de Riscos Operacionais
            </h4>
            <Table className="print-table">
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold">Risco</TableHead>
                  <TableHead className="font-bold">Causa</TableHead>
                  <TableHead className="font-bold">Impacto</TableHead>
                  <TableHead className="font-bold">Controle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {content.matriz_riscos.filter(r => r.risco).map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{item.risco}</TableCell>
                    <TableCell>{item.causa}</TableCell>
                    <TableCell>{item.impacto}</TableCell>
                    <TableCell>{item.controle}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* 7. Indicadores */}
        {content.indicadores && content.indicadores.filter(i => i.nome).length > 0 && (
          <div className="print-section page-break-inside-avoid">
            <h4 className="subsection-title">7. Indicadores</h4>
            <Table className="print-table">
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold">Nome</TableHead>
                  <TableHead className="font-bold">Fórmula</TableHead>
                  <TableHead className="font-bold">Meta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {content.indicadores.filter(i => i.nome).map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{item.nome}</TableCell>
                    <TableCell>{item.formula}</TableCell>
                    <TableCell>{item.meta}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* 8. Evidência */}
        {content.evidencia_execucao?.tipo_evidencia && (
          <div className="print-section page-break-inside-avoid">
            <h4 className="subsection-title flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-green-600" />
              8. Evidência de Execução
            </h4>
            <div className="bg-blue-50 border border-blue-200 rounded p-3 space-y-2">
              <p><strong>Tipo:</strong> {content.evidencia_execucao.tipo_evidencia}</p>
              {content.evidencia_execucao.descricao && (
                <p><strong>Descrição:</strong> {content.evidencia_execucao.descricao}</p>
              )}
              {content.evidencia_execucao.periodo_retencao && (
                <div className="border-t border-blue-300 pt-2 mt-2">
                  <p><strong>Retenção:</strong> {content.evidencia_execucao.periodo_retencao.replace('_', ' ')}</p>
                  {content.evidencia_execucao.justificativa_retencao && (
                    <p className="text-sm mt-1"><strong>Justificativa:</strong> {content.evidencia_execucao.justificativa_retencao}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <footer className="print-footer text-center text-xs text-gray-500 border-t pt-2 mt-6">
        IT {index} - {it.code} - Versão {it.version || "1"}
      </footer>
    </div>
  );
}