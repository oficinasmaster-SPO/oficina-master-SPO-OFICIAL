import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function PrintProcessView({ processDoc, its = [], workshop }) {
  const content = processDoc?.content_json || {};

  return (
    <div className="print-container">
      {/* Cabeçalho MAP */}
      <header className="print-header">
        {workshop?.logo_url && (
          <img src={workshop.logo_url} alt="Logo" style={{ height: '40px', marginBottom: '10px' }} />
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
            <p style={{ margin: '1mm 0' }}><strong>Data:</strong> {new Date(processDoc.updated_date || processDoc.created_date).toLocaleDateString('pt-BR')}</p>
          </div>
        </div>
      </header>

      {/* Conteúdo MAP */}
      <section>
        <div className="print-section">
          <h3 className="section-title">1. Objetivo</h3>
          <p className="section-content">{content.objetivo || "Não definido."}</p>
        </div>

        <div className="print-section">
          <h3 className="section-title">2. Campo de Aplicação</h3>
          <p className="section-content">{content.campo_aplicacao || "Não definido."}</p>
        </div>

        {content.informacoes_complementares && (
          <div className="print-section">
            <h3 className="section-title">3. Informações Complementares</h3>
            <p className="section-content">{content.informacoes_complementares}</p>
          </div>
        )}

        <div className="print-section">
          <h3 className="section-title">4. Fluxo do Processo</h3>
          {content.fluxo_processo && (
            <p className="section-content" style={{ marginBottom: '5mm' }}>{content.fluxo_processo}</p>
          )}
          {content.fluxo_image_url && (
            <img 
              src={content.fluxo_image_url} 
              alt="Fluxograma" 
              className="flowchart-image"
              style={{ margin: '5mm auto', display: 'block', maxHeight: '180mm' }}
            />
          )}
        </div>

        {content.atividades && content.atividades.length > 0 && (
          <div className="print-section page-break-inside-avoid">
            <h3 className="section-title">5. Atividades e Responsabilidades</h3>
            <Table className="print-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Atividade</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Ferramentas/Docs</TableHead>
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

        {content.matriz_riscos && content.matriz_riscos.length > 0 && (
          <div className="print-section page-break-inside-avoid">
            <h3 className="section-title">6. Matriz de Riscos</h3>
            <Table className="print-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Risco</TableHead>
                  <TableHead>Fonte</TableHead>
                  <TableHead>Impacto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Controle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {content.matriz_riscos.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{item.identificacao}</TableCell>
                    <TableCell>{item.fonte}</TableCell>
                    <TableCell>{item.impacto}</TableCell>
                    <TableCell>{item.categoria}</TableCell>
                    <TableCell>{item.controle}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {content.inter_relacoes && content.inter_relacoes.length > 0 && (
          <div className="print-section page-break-inside-avoid">
            <h3 className="section-title">7. Inter-relação entre Áreas</h3>
            <Table className="print-table">
              <TableHeader>
                <TableRow>
                  <TableHead style={{ width: '35%' }}>Área</TableHead>
                  <TableHead>Interação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {content.inter_relacoes.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{item.area}</TableCell>
                    <TableCell>{item.interacao}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {content.indicadores && content.indicadores.length > 0 && (
          <div className="print-section page-break-inside-avoid">
            <h3 className="section-title">8. Indicadores de Desempenho</h3>
            <Table className="print-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Indicador</TableHead>
                  <TableHead>Meta</TableHead>
                  <TableHead>Como Medir</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {content.indicadores.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{item.indicador}</TableCell>
                    <TableCell>{item.meta}</TableCell>
                    <TableCell>{item.como_medir}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <footer className="print-footer">
        <p>Documento Controlado - Status: {processDoc.operational_status || 'Em elaboração'}</p>
        <p>Oficinas Master - {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
      </footer>

      {/* ITs/FRs */}
      {its && its.length > 0 && its.map((it, idx) => (
        <div key={it.id} className="page-break-before">
          <PrintITView it={it} index={idx + 1} />
        </div>
      ))}
    </div>
  );
}

function PrintITView({ it, index }) {
  const content = it?.content || {};

  return (
    <div className="print-container">
      <header className="print-header">
        <div style={{ borderBottom: '2pt solid #000', paddingBottom: '6mm', marginBottom: '8mm' }}>
          <div style={{ display: 'inline-block', padding: '3mm', backgroundColor: it.type === 'IT' ? '#16a34a' : '#ea580c', color: 'white', fontWeight: 'bold', marginBottom: '3mm' }}>
            {it.type}
          </div>
          <h2 style={{ fontSize: '16pt', fontWeight: 'bold', margin: '3mm 0 2mm 0' }}>{it.title}</h2>
          {it.description && <p style={{ fontSize: '10pt', margin: '2mm 0' }}>{it.description}</p>}
          <div style={{ marginTop: '4mm', fontSize: '10pt' }}>
            <p style={{ margin: '1mm 0' }}><strong>Código:</strong> {it.code}</p>
            <p style={{ margin: '1mm 0' }}><strong>Versão:</strong> {it.version || "1"}</p>
          </div>
        </div>
      </header>

      <div className="print-section">
        <h4 className="subsection-title">1. Objetivo</h4>
        <p className="section-content">{content.objetivo || "Não definido."}</p>
      </div>

      <div className="print-section">
        <h4 className="subsection-title">2. Campo de Aplicação</h4>
        <p className="section-content">{content.campo_aplicacao || "Não definido."}</p>
      </div>

      {content.informacoes_complementares && (
        <div className="print-section">
          <h4 className="subsection-title">3. Informações Complementares</h4>
          <p className="section-content">{content.informacoes_complementares}</p>
        </div>
      )}

      <div className="print-section">
        <h4 className="subsection-title">4. Fluxo de Execução</h4>
        {content.fluxo_descricao && (
          <p className="section-content" style={{ marginBottom: '5mm' }}>{content.fluxo_descricao}</p>
        )}
        {content.fluxo_image_url && (
          <img 
            src={content.fluxo_image_url} 
            alt="Fluxograma IT"
            style={{ margin: '5mm auto', display: 'block', maxHeight: '150mm', maxWidth: '100%' }}
          />
        )}
      </div>

      {content.atividades && content.atividades.length > 0 && (
        <div className="print-section page-break-inside-avoid">
          <h4 className="subsection-title">5. Atividades e Responsabilidades</h4>
          <Table className="print-table">
            <TableHeader>
              <TableRow>
                <TableHead>Atividade</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Frequência</TableHead>
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

      {content.matriz_riscos && content.matriz_riscos.filter(r => r.risco).length > 0 && (
        <div className="print-section page-break-inside-avoid">
          <h4 className="subsection-title">6. Matriz de Riscos</h4>
          <Table className="print-table">
            <TableHeader>
              <TableRow>
                <TableHead>Risco</TableHead>
                <TableHead>Causa</TableHead>
                <TableHead>Impacto</TableHead>
                <TableHead>Controle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {content.matriz_riscos.filter(r => r.risco).map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell>{item.risco}</TableCell>
                  <TableCell>{item.causa}</TableCell>
                  <TableCell>{item.impacto}</TableCell>
                  <TableCell>{item.controle}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {content.inter_relacoes && content.inter_relacoes.length > 0 && (
        <div className="print-section page-break-inside-avoid">
          <h4 className="subsection-title">7. Inter-relações</h4>
          <Table className="print-table">
            <TableHeader>
              <TableRow>
                <TableHead style={{ width: '35%' }}>Área</TableHead>
                <TableHead>Interação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {content.inter_relacoes.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell>{item.area}</TableCell>
                  <TableCell>{item.interacao}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {content.indicadores && content.indicadores.filter(i => i.nome).length > 0 && (
        <div className="print-section page-break-inside-avoid">
          <h4 className="subsection-title">8. Indicadores</h4>
          <Table className="print-table">
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Fórmula</TableHead>
                <TableHead>Meta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {content.indicadores.filter(i => i.nome).map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell>{item.nome}</TableCell>
                  <TableCell>{item.formula}</TableCell>
                  <TableCell>{item.meta}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {content.evidencia_execucao?.tipo_evidencia && (
        <div className="print-section page-break-inside-avoid">
          <h4 className="subsection-title">9. Evidência de Execução</h4>
          <div style={{ border: '1pt solid #333', padding: '4mm', backgroundColor: '#f9f9f9', marginTop: '3mm' }}>
            <p style={{ margin: '2mm 0' }}><strong>Tipo:</strong> {content.evidencia_execucao.tipo_evidencia}</p>
            {content.evidencia_execucao.descricao && (
              <p style={{ margin: '2mm 0' }}><strong>Descrição:</strong> {content.evidencia_execucao.descricao}</p>
            )}
            {content.evidencia_execucao.periodo_retencao && (
              <>
                <div style={{ borderTop: '1pt solid #ccc', marginTop: '3mm', paddingTop: '3mm' }}>
                  <p style={{ margin: '2mm 0' }}><strong>Período de Retenção:</strong> {content.evidencia_execucao.periodo_retencao.replace(/_/g, ' ')}</p>
                </div>
                {content.evidencia_execucao.justificativa_retencao && (
                  <p style={{ margin: '2mm 0', fontSize: '10pt' }}><strong>Justificativa:</strong> {content.evidencia_execucao.justificativa_retencao}</p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <footer className="print-footer">
        <p>Documento Controlado - Status: {processDoc.operational_status || 'Em elaboração'}</p>
        <p>Oficinas Master - {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
      </footer>

      {/* ITs/FRs */}
      {its && its.length > 0 && its.map((it, idx) => (
        <div key={it.id} className="page-break-before">
          <PrintITView it={it} index={idx + 1} />
        </div>
      ))}
    </div>
  );
}

function PrintITView({ it, index }) {
  const content = it?.content || {};

  return (
    <div className="print-container">
      <header className="print-header">
        <div style={{ borderBottom: '2pt solid #000', paddingBottom: '6mm', marginBottom: '8mm' }}>
          <div style={{ display: 'inline-block', padding: '3mm', backgroundColor: it.type === 'IT' ? '#16a34a' : '#ea580c', color: 'white', fontWeight: 'bold', marginBottom: '3mm' }}>
            {it.type}
          </div>
          <h2 style={{ fontSize: '16pt', fontWeight: 'bold', margin: '3mm 0 2mm 0' }}>{it.title}</h2>
          {it.description && <p style={{ fontSize: '10pt', margin: '2mm 0' }}>{it.description}</p>}
          <div style={{ marginTop: '4mm', fontSize: '10pt' }}>
            <p style={{ margin: '1mm 0' }}><strong>Código:</strong> {it.code}</p>
            <p style={{ margin: '1mm 0' }}><strong>Versão:</strong> {it.version || "1"}</p>
          </div>
        </div>
      </header>

      <div className="print-section">
        <h4 className="subsection-title">1. Objetivo</h4>
        <p className="section-content">{content.objetivo || "Não definido."}</p>
      </div>

      <div className="print-section">
        <h4 className="subsection-title">2. Campo de Aplicação</h4>
        <p className="section-content">{content.campo_aplicacao || "Não definido."}</p>
      </div>

      {content.informacoes_complementares && (
        <div className="print-section">
          <h4 className="subsection-title">3. Informações Complementares</h4>
          <p className="section-content">{content.informacoes_complementares}</p>
        </div>
      )}

      <div className="print-section">
        <h4 className="subsection-title">4. Fluxo de Execução</h4>
        {content.fluxo_descricao && (
          <p className="section-content" style={{ marginBottom: '5mm' }}>{content.fluxo_descricao}</p>
        )}
        {content.fluxo_image_url && (
          <img 
            src={content.fluxo_image_url} 
            alt="Fluxograma IT"
            style={{ margin: '5mm auto', display: 'block', maxHeight: '150mm', maxWidth: '100%' }}
          />
        )}
      </div>

      {content.atividades && content.atividades.length > 0 && (
        <div className="print-section page-break-inside-avoid">
          <h4 className="subsection-title">5. Atividades e Responsabilidades</h4>
          <Table className="print-table">
            <TableHeader>
              <TableRow>
                <TableHead>Atividade</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Frequência</TableHead>
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

      {content.matriz_riscos && content.matriz_riscos.filter(r => r.risco).length > 0 && (
        <div className="print-section page-break-inside-avoid">
          <h4 className="subsection-title">6. Matriz de Riscos</h4>
          <Table className="print-table">
            <TableHeader>
              <TableRow>
                <TableHead>Risco</TableHead>
                <TableHead>Causa</TableHead>
                <TableHead>Impacto</TableHead>
                <TableHead>Controle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {content.matriz_riscos.filter(r => r.risco).map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell>{item.risco}</TableCell>
                  <TableCell>{item.causa}</TableCell>
                  <TableCell>{item.impacto}</TableCell>
                  <TableCell>{item.controle}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {content.inter_relacoes && content.inter_relacoes.length > 0 && (
        <div className="print-section page-break-inside-avoid">
          <h4 className="subsection-title">7. Inter-relações</h4>
          <Table className="print-table">
            <TableHeader>
              <TableRow>
                <TableHead style={{ width: '35%' }}>Área</TableHead>
                <TableHead>Interação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {content.inter_relacoes.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell>{item.area}</TableCell>
                  <TableCell>{item.interacao}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {content.indicadores && content.indicadores.filter(i => i.nome).length > 0 && (
        <div className="print-section page-break-inside-avoid">
          <h4 className="subsection-title">8. Indicadores</h4>
          <Table className="print-table">
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Fórmula</TableHead>
                <TableHead>Meta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {content.indicadores.filter(i => i.nome).map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell>{item.nome}</TableCell>
                  <TableCell>{item.formula}</TableCell>
                  <TableCell>{item.meta}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {content.evidencia_execucao?.tipo_evidencia && (
        <div className="print-section page-break-inside-avoid">
          <h4 className="subsection-title">9. Evidência de Execução</h4>
          <div style={{ border: '1pt solid #333', padding: '4mm', backgroundColor: '#f9f9f9', marginTop: '3mm' }}>
            <p style={{ margin: '2mm 0' }}><strong>Tipo:</strong> {content.evidencia_execucao.tipo_evidencia}</p>
            {content.evidencia_execucao.descricao && (
              <p style={{ margin: '2mm 0' }}><strong>Descrição:</strong> {content.evidencia_execucao.descricao}</p>
            )}
            {content.evidencia_execucao.periodo_retencao && (
              <>
                <div style={{ borderTop: '1pt solid #ccc', marginTop: '3mm', paddingTop: '3mm' }}>
                  <p style={{ margin: '2mm 0' }}><strong>Período de Retenção:</strong> {content.evidencia_execucao.periodo_retencao.replace(/_/g, ' ')}</p>
                </div>
                {content.evidencia_execucao.justificativa_retencao && (
                  <p style={{ margin: '2mm 0', fontSize: '10pt' }}><strong>Justificativa:</strong> {content.evidencia_execucao.justificativa_retencao}</p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <footer className="print-footer">
        <p>{it.type} - {it.code} - Versão {it.version || "1"}</p>
      </footer>
    </div>
  );
}