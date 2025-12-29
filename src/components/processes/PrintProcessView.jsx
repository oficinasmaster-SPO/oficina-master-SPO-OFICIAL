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
        {workshop?.logo_url && (
          <img src={workshop.logo_url} alt="Logo Oficina" style={{ height: '40px', marginBottom: '10px' }} />
        )}
        <div style={{ borderBottom: '3pt solid #dc2626', paddingBottom: '8mm', marginBottom: '8mm' }}>
          <h1 style={{ fontSize: '18pt', fontWeight: 'bold', margin: 0, textTransform: 'uppercase' }}>
            Mapa da Auto Gestão do Processo
          </h1>
          <h2 style={{ fontSize: '16pt', fontWeight: 'bold', margin: '3mm 0 0 0' }}>
            {processDoc.title}
          </h2>
          <div style={{ marginTop: '5mm', fontSize: '10pt' }}>
            <p style={{ margin: '1mm 0' }}><strong>Código:</strong> {processDoc.code || "N/A"}</p>
            <p style={{ margin: '1mm 0' }}><strong>Versão:</strong> {processDoc.revision || "1"}</p>
            <p style={{ margin: '1mm 0' }}><strong>Categoria:</strong> {processDoc.category}</p>
            <p style={{ margin: '1mm 0' }}><strong>Status:</strong> {processDoc.status || 'ativo'}</p>
            <p style={{ margin: '1mm 0' }}><strong>Data de Emissão:</strong> {new Date(processDoc.updated_date || processDoc.created_date).toLocaleDateString('pt-BR')}</p>
          </div>
        </div>
      </header>

      {/* Conteúdo do MAP */}
      <section style={{ marginBottom: '10mm' }}>
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
            <p className="section-content" style={{ marginBottom: '5mm' }}>{content.fluxo_processo}</p>
          )}
          {content.fluxo_image_url && (
            <div style={{ textAlign: 'center', margin: '5mm 0' }}>
              <img 
                src={content.fluxo_image_url} 
                alt="Fluxograma" 
                style={{ maxWidth: '100%', maxHeight: '180mm', objectFit: 'contain' }}
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
      <footer className="print-footer">
        <p style={{ margin: '1mm 0' }}>Documento Controlado - Status: {processDoc.operational_status || 'Em elaboração'}</p>
        <p style={{ margin: '1mm 0' }}>Oficinas Master - Impresso em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
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
    <div className="print-container">
      {/* Cabeçalho IT */}
      <header className="print-header">
        <div style={{ borderBottom: '2pt solid #000', paddingBottom: '6mm', marginBottom: '8mm' }}>
          <div style={{ display: 'inline-block', padding: '3mm', backgroundColor: it.type === 'IT' ? '#16a34a' : '#ea580c', color: 'white', fontWeight: 'bold', marginBottom: '3mm' }}>
            {it.type}
          </div>
          <h2 style={{ fontSize: '16pt', fontWeight: 'bold', margin: '3mm 0 2mm 0' }}>{it.title}</h2>
          {it.description && (
            <p style={{ fontSize: '10pt', color: '#333', margin: '2mm 0' }}>{it.description}</p>
          )}
          <div style={{ marginTop: '4mm', fontSize: '10pt' }}>
            <p style={{ margin: '1mm 0' }}><strong>Código:</strong> {it.code}</p>
            <p style={{ margin: '1mm 0' }}><strong>Versão:</strong> {it.version || "1"}</p>
            <p style={{ margin: '1mm 0' }}><strong>Status:</strong> {it.status || "ativo"}</p>
          </div>
        </div>
      </header>

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
          <p className="section-content" style={{ marginBottom: '5mm' }}>{content.fluxo_descricao}</p>
        )}
        {content.fluxo_image_url && (
          <img 
            src={content.fluxo_image_url} 
            alt="Fluxograma IT" 
            className="flowchart-image"
            style={{ margin: '5mm auto', display: 'block' }}
          />
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