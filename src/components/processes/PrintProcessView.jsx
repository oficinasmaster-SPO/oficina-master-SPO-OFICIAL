import React from "react";

export default function PrintProcessView({ processDoc, its = [], workshop }) {
  const content = processDoc?.content_json || {};

  const styles = {
    container: {
      width: '210mm',
      maxWidth: '100%',
      margin: '0 auto',
      padding: '20mm',
      backgroundColor: 'white',
      color: '#000',
      fontFamily: 'Arial, sans-serif',
      fontSize: '11pt',
      lineHeight: '1.6',
      boxSizing: 'border-box'
    },
    header: {
      marginBottom: '20px',
      paddingBottom: '10px',
      borderBottom: '3px solid #dc2626',
      textAlign: 'left'
    },
    h1: {
      fontSize: '18pt',
      fontWeight: 'bold',
      margin: '0 0 8px 0',
      textTransform: 'uppercase',
      color: '#000'
    },
    h2: {
      fontSize: '16pt',
      fontWeight: 'bold',
      margin: '8px 0',
      color: '#000'
    },
    h3: {
      fontSize: '14pt',
      fontWeight: 'bold',
      margin: '24px 0 8px 0',
      paddingBottom: '4px',
      borderBottom: '2px solid #000',
      textTransform: 'uppercase',
      color: '#000'
    },
    h4: {
      fontSize: '12pt',
      fontWeight: 'bold',
      margin: '16px 0 8px 0',
      paddingBottom: '2px',
      borderBottom: '1px solid #666',
      color: '#000'
    },
    metadata: {
      fontSize: '10pt',
      margin: '10px 0 0 0',
      lineHeight: '1.5'
    },
    metadataItem: {
      margin: '2px 0',
      color: '#000'
    },
    section: {
      marginBottom: '24px',
      textAlign: 'left'
    },
    content: {
      fontSize: '11pt',
      lineHeight: '1.6',
      color: '#000',
      marginBottom: '16px',
      whiteSpace: 'pre-line',
      textAlign: 'left'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      marginTop: '12px',
      marginBottom: '20px',
      fontSize: '10pt'
    },
    th: {
      backgroundColor: '#e5e5e5',
      border: '1px solid #000',
      padding: '8px',
      textAlign: 'left',
      fontWeight: 'bold',
      color: '#000',
      verticalAlign: 'middle'
    },
    td: {
      border: '1px solid #666',
      padding: '8px',
      verticalAlign: 'top',
      color: '#000',
      textAlign: 'left'
    },
    tdEven: {
      backgroundColor: '#f9f9f9'
    },
    image: {
      maxWidth: '100%',
      height: 'auto',
      display: 'block',
      margin: '12px auto',
      maxHeight: '180mm',
      objectFit: 'contain'
    },
    footer: {
      marginTop: '20px',
      paddingTop: '10px',
      borderTop: '1px solid #ccc',
      fontSize: '9pt',
      textAlign: 'center',
      color: '#666'
    },
    evidenceBox: {
      border: '1px solid #333',
      padding: '12px',
      backgroundColor: '#f9f9f9',
      marginTop: '8px'
    },
    evidenceItem: {
      margin: '4px 0',
      fontSize: '10pt'
    },
    pageBreak: {
      pageBreakBefore: 'always',
      breakBefore: 'page'
    }
  };

  return (
    <div style={styles.container}>
      {/* Cabeçalho MAP */}
      <header style={styles.header}>
        {workshop?.logo_url && (
          <img src={workshop.logo_url} alt="Logo" style={{ height: '40px', marginBottom: '10px' }} />
        )}
        <h1 style={styles.h1}>Mapa da Auto Gestão do Processo</h1>
        <h2 style={styles.h2}>{processDoc.title}</h2>
        <div style={styles.metadata}>
          <p style={styles.metadataItem}><strong>Código:</strong> {processDoc.code || "N/A"}</p>
          <p style={styles.metadataItem}><strong>Versão:</strong> {processDoc.revision || "1"}</p>
          <p style={styles.metadataItem}><strong>Categoria:</strong> {processDoc.category}</p>
          <p style={styles.metadataItem}><strong>Status:</strong> {processDoc.status || 'ativo'}</p>
          <p style={styles.metadataItem}><strong>Data de Emissão:</strong> {new Date(processDoc.updated_date || processDoc.created_date).toLocaleDateString('pt-BR')}</p>
        </div>
      </header>

      {/* Conteúdo MAP */}
      <section>
        <div style={styles.section}>
          <h3 style={styles.h3}>1. Objetivo</h3>
          <p style={styles.content}>{content.objetivo || "Não definido."}</p>
        </div>

        <div style={styles.section}>
          <h3 style={styles.h3}>2. Campo de Aplicação</h3>
          <p style={styles.content}>{content.campo_aplicacao || "Não definido."}</p>
        </div>

        {content.informacoes_complementares && (
          <div style={styles.section}>
            <h3 style={styles.h3}>3. Informações Complementares</h3>
            <p style={styles.content}>{content.informacoes_complementares}</p>
          </div>
        )}

        <div style={styles.section}>
          <h3 style={styles.h3}>4. Fluxo do Processo</h3>
          {content.fluxo_processo && <p style={styles.content}>{content.fluxo_processo}</p>}
          {content.fluxo_image_url && (
            <img src={content.fluxo_image_url} alt="Fluxograma" style={styles.image} />
          )}
        </div>

        {content.atividades && content.atividades.length > 0 && (
          <div style={styles.section}>
            <h3 style={styles.h3}>5. Atividades e Responsabilidades</h3>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Atividade</th>
                  <th style={styles.th}>Responsável</th>
                  <th style={styles.th}>Ferramentas/Docs</th>
                </tr>
              </thead>
              <tbody>
                {content.atividades.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{...styles.td, ...(idx % 2 === 1 ? styles.tdEven : {})}}>{item.atividade}</td>
                    <td style={{...styles.td, ...(idx % 2 === 1 ? styles.tdEven : {})}}>{item.responsavel}</td>
                    <td style={{...styles.td, ...(idx % 2 === 1 ? styles.tdEven : {})}}>{item.ferramentas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {content.matriz_riscos && content.matriz_riscos.length > 0 && (
          <div style={styles.section}>
            <h3 style={styles.h3}>6. Matriz de Riscos</h3>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Risco</th>
                  <th style={styles.th}>Fonte</th>
                  <th style={styles.th}>Impacto</th>
                  <th style={styles.th}>Categoria</th>
                  <th style={styles.th}>Controle</th>
                </tr>
              </thead>
              <tbody>
                {content.matriz_riscos.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{...styles.td, ...(idx % 2 === 1 ? styles.tdEven : {})}}>{item.identificacao}</td>
                    <td style={{...styles.td, ...(idx % 2 === 1 ? styles.tdEven : {})}}>{item.fonte}</td>
                    <td style={{...styles.td, ...(idx % 2 === 1 ? styles.tdEven : {})}}>{item.impacto}</td>
                    <td style={{...styles.td, ...(idx % 2 === 1 ? styles.tdEven : {})}}>{item.categoria}</td>
                    <td style={{...styles.td, ...(idx % 2 === 1 ? styles.tdEven : {})}}>{item.controle}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {content.inter_relacoes && content.inter_relacoes.length > 0 && (
          <div style={styles.section}>
            <h3 style={styles.h3}>7. Inter-relação entre Áreas</h3>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{...styles.th, width: '35%'}}>Área</th>
                  <th style={styles.th}>Interação</th>
                </tr>
              </thead>
              <tbody>
                {content.inter_relacoes.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{...styles.td, ...(idx % 2 === 1 ? styles.tdEven : {})}}>{item.area}</td>
                    <td style={{...styles.td, ...(idx % 2 === 1 ? styles.tdEven : {})}}>{item.interacao}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {content.indicadores && content.indicadores.length > 0 && (
          <div style={styles.section}>
            <h3 style={styles.h3}>8. Indicadores de Desempenho</h3>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Indicador</th>
                  <th style={styles.th}>Meta</th>
                  <th style={styles.th}>Como Medir</th>
                </tr>
              </thead>
              <tbody>
                {content.indicadores.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{...styles.td, ...(idx % 2 === 1 ? styles.tdEven : {})}}>{item.indicador}</td>
                    <td style={{...styles.td, ...(idx % 2 === 1 ? styles.tdEven : {})}}>{item.meta}</td>
                    <td style={{...styles.td, ...(idx % 2 === 1 ? styles.tdEven : {})}}>{item.como_medir}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <footer style={styles.footer}>
        <p>Documento Controlado - Status: {processDoc.operational_status || 'Em elaboração'}</p>
        <p>Oficinas Master - Impresso em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
      </footer>

      {/* ITs/FRs - cada um em nova página */}
      {its && its.length > 0 && its.map((it, idx) => (
        <div key={it.id} style={styles.pageBreak}>
          <PrintITContent it={it} index={idx + 1} styles={styles} />
        </div>
      ))}
    </div>
  );
}

function PrintITContent({ it, index, styles }) {
  const content = it?.content || {};

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={{ 
          display: 'inline-block', 
          padding: '8px 12px', 
          backgroundColor: it.type === 'IT' ? '#16a34a' : '#ea580c', 
          color: 'white', 
          fontWeight: 'bold',
          marginBottom: '8px'
        }}>
          {it.type}
        </div>
        <h2 style={styles.h2}>{it.title}</h2>
        {it.description && <p style={{ fontSize: '10pt', margin: '4px 0', color: '#333' }}>{it.description}</p>}
        <div style={styles.metadata}>
          <p style={styles.metadataItem}><strong>Código:</strong> {it.code}</p>
          <p style={styles.metadataItem}><strong>Versão:</strong> {it.version || "1"}</p>
          <p style={styles.metadataItem}><strong>Status:</strong> {it.status || "ativo"}</p>
        </div>
      </header>

      <div style={styles.section}>
        <h4 style={styles.h4}>1. Objetivo</h4>
        <p style={styles.content}>{content.objetivo || "Não definido."}</p>
      </div>

      <div style={styles.section}>
        <h4 style={styles.h4}>2. Campo de Aplicação</h4>
        <p style={styles.content}>{content.campo_aplicacao || "Não definido."}</p>
      </div>

      {content.informacoes_complementares && (
        <div style={styles.section}>
          <h4 style={styles.h4}>3. Informações Complementares</h4>
          <p style={styles.content}>{content.informacoes_complementares}</p>
        </div>
      )}

      <div style={styles.section}>
        <h4 style={styles.h4}>4. Fluxo de Execução</h4>
        {content.fluxo_descricao && <p style={styles.content}>{content.fluxo_descricao}</p>}
        {content.fluxo_image_url && (
          <img src={content.fluxo_image_url} alt="Fluxograma IT" style={{...styles.image, maxHeight: '150mm'}} />
        )}
      </div>

      {content.atividades && content.atividades.length > 0 && (
        <div style={styles.section}>
          <h4 style={styles.h4}>5. Atividades e Responsabilidades</h4>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Atividade</th>
                <th style={styles.th}>Responsável</th>
                <th style={styles.th}>Frequência</th>
              </tr>
            </thead>
            <tbody>
              {content.atividades.map((item, idx) => (
                <tr key={idx}>
                  <td style={{...styles.td, ...(idx % 2 === 1 ? styles.tdEven : {})}}>{item.atividade}</td>
                  <td style={{...styles.td, ...(idx % 2 === 1 ? styles.tdEven : {})}}>{item.responsavel}</td>
                  <td style={{...styles.td, ...(idx % 2 === 1 ? styles.tdEven : {})}}>{item.frequencia}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {content.matriz_riscos && content.matriz_riscos.filter(r => r.risco).length > 0 && (
        <div style={styles.section}>
          <h4 style={styles.h4}>6. Matriz de Riscos</h4>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Risco</th>
                <th style={styles.th}>Causa</th>
                <th style={styles.th}>Impacto</th>
                <th style={styles.th}>Controle</th>
              </tr>
            </thead>
            <tbody>
              {content.matriz_riscos.filter(r => r.risco).map((item, idx) => (
                <tr key={idx}>
                  <td style={{...styles.td, ...(idx % 2 === 1 ? styles.tdEven : {})}}>{item.risco}</td>
                  <td style={{...styles.td, ...(idx % 2 === 1 ? styles.tdEven : {})}}>{item.causa}</td>
                  <td style={{...styles.td, ...(idx % 2 === 1 ? styles.tdEven : {})}}>{item.impacto}</td>
                  <td style={{...styles.td, ...(idx % 2 === 1 ? styles.tdEven : {})}}>{item.controle}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {content.inter_relacoes && content.inter_relacoes.length > 0 && (
        <div style={styles.section}>
          <h4 style={styles.h4}>7. Inter-relações</h4>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{...styles.th, width: '35%'}}>Área</th>
                <th style={styles.th}>Interação</th>
              </tr>
            </thead>
            <tbody>
              {content.inter_relacoes.map((item, idx) => (
                <tr key={idx}>
                  <td style={{...styles.td, ...(idx % 2 === 1 ? styles.tdEven : {})}}>{item.area}</td>
                  <td style={{...styles.td, ...(idx % 2 === 1 ? styles.tdEven : {})}}>{item.interacao}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {content.indicadores && content.indicadores.filter(i => i.nome).length > 0 && (
        <div style={styles.section}>
          <h4 style={styles.h4}>8. Indicadores</h4>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Nome</th>
                <th style={styles.th}>Fórmula</th>
                <th style={styles.th}>Meta</th>
              </tr>
            </thead>
            <tbody>
              {content.indicadores.filter(i => i.nome).map((item, idx) => (
                <tr key={idx}>
                  <td style={{...styles.td, ...(idx % 2 === 1 ? styles.tdEven : {})}}>{item.nome}</td>
                  <td style={{...styles.td, ...(idx % 2 === 1 ? styles.tdEven : {})}}>{item.formula}</td>
                  <td style={{...styles.td, ...(idx % 2 === 1 ? styles.tdEven : {})}}>{item.meta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {content.evidencia_execucao?.tipo_evidencia && (
        <div style={styles.section}>
          <h4 style={styles.h4}>9. Evidência de Execução</h4>
          <div style={styles.evidenceBox}>
            <p style={styles.evidenceItem}><strong>Tipo:</strong> {content.evidencia_execucao.tipo_evidencia}</p>
            {content.evidencia_execucao.descricao && (
              <p style={styles.evidenceItem}><strong>Descrição:</strong> {content.evidencia_execucao.descricao}</p>
            )}
            {content.evidencia_execucao.periodo_retencao && (
              <>
                <div style={{ borderTop: '1px solid #ccc', marginTop: '8px', paddingTop: '8px' }}>
                  <p style={styles.evidenceItem}><strong>Período de Retenção:</strong> {content.evidencia_execucao.periodo_retencao.replace(/_/g, ' ')}</p>
                </div>
                {content.evidencia_execucao.justificativa_retencao && (
                  <p style={{...styles.evidenceItem, fontSize: '9pt'}}><strong>Justificativa:</strong> {content.evidencia_execucao.justificativa_retencao}</p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <footer style={styles.footer}>
        <p>{it.type} - {it.code} - Versão {it.version || "1"}</p>
      </footer>
    </div>
  );
}