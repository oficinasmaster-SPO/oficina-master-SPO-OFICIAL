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
      textAlign: 'center',
      marginBottom: '16px'
    },
    title: {
      fontSize: '20pt',
      fontWeight: 'bold',
      margin: '0 0 4px 0',
      textTransform: 'uppercase',
      color: '#000',
      letterSpacing: '1px'
    },
    subtitle: {
      fontSize: '14pt',
      margin: '0 0 16px 0',
      color: '#000',
      fontWeight: 'normal'
    },
    metaLine: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: '10pt',
      marginBottom: '12px',
      color: '#000',
      textAlign: 'left'
    },
    redLine: {
      height: '3px',
      backgroundColor: '#dc2626',
      marginBottom: '16px'
    },
    highlightBox: {
      fontSize: '12pt',
      margin: '16px 0',
      color: '#dc2626',
      fontWeight: 'bold',
      textAlign: 'left'
    },
    infoTable: {
      width: '100%',
      borderCollapse: 'collapse',
      marginBottom: '20px',
      fontSize: '10pt',
      border: 'none'
    },
    tableHeader: {
      backgroundColor: '#e5e5e5',
      padding: '12px',
      textAlign: 'left',
      fontWeight: 'bold',
      color: '#666',
      textTransform: 'uppercase',
      fontSize: '9pt',
      letterSpacing: '0.5px',
      border: 'none'
    },
    tableCell: {
      padding: '16px 12px',
      verticalAlign: 'top',
      color: '#000',
      lineHeight: '1.6',
      border: 'none'
    },
    sectionCard: {
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '16px',
      backgroundColor: '#fafafa',
      pageBreakInside: 'avoid'
    },
    sectionTitle: {
      fontSize: '12pt',
      fontWeight: 'bold',
      margin: '0 0 12px 0',
      color: '#000',
      textTransform: 'uppercase'
    },
    sectionContent: {
      fontSize: '11pt',
      lineHeight: '1.6',
      color: '#000',
      whiteSpace: 'pre-line'
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
      marginTop: '30px',
      paddingTop: '15px',
      borderTop: '1px solid #ccc',
      fontSize: '9pt',
      textAlign: 'center',
      color: '#666'
    },
    list: {
      listStyleType: 'disc',
      paddingLeft: '20px',
      margin: '8px 0'
    },
    listItem: {
      margin: '4px 0',
      fontSize: '10pt',
      color: '#000'
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
      <div style={styles.header}>
        {workshop?.logo_url && (
          <img src={workshop.logo_url} alt="Logo" style={{ height: '40px', marginBottom: '16px' }} />
        )}
        <h1 style={styles.title}>GESTÃO DE PROCESSOS</h1>
        <p style={styles.subtitle}>MAP - Mapa de Auto Gestão do Processo</p>
      </div>

      {/* Linha de Metadados */}
      <div style={styles.metaLine}>
        <span><strong>Código:</strong> {processDoc.code || "N/A"}</span>
        <span><strong>Data/Hora:</strong> {new Date(processDoc.updated_date || processDoc.created_date).toLocaleString('pt-BR')}</span>
        <span style={{ 
          padding: '4px 12px', 
          backgroundColor: '#22c55e', 
          color: 'white', 
          borderRadius: '4px',
          fontSize: '9pt',
          fontWeight: 'bold'
        }}>{processDoc.status || 'Ativo'}</span>
      </div>

      {/* Linha Vermelha */}
      <div style={styles.redLine}></div>

      {/* Destaque Categoria */}
      <div style={styles.highlightBox}>
        Categoria: <span style={{ textTransform: 'uppercase' }}>{processDoc.category}</span>
      </div>

      {/* Tabela de Informações */}
      <table style={styles.infoTable}>
        <thead>
          <tr>
            <th style={styles.tableHeader}>PROCESSO</th>
            <th style={styles.tableHeader}>RESPONSÁVEL</th>
            <th style={styles.tableHeader}>VERSÃO</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tableCell}>
              <strong>{processDoc.title}</strong>
            </td>
            <td style={styles.tableCell}>
              {processDoc.created_by || 'Não definido'}
            </td>
            <td style={styles.tableCell}>
              Versão {processDoc.revision || "1"}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Conteúdo MAP em Cards */}
      <section>
        <div style={styles.sectionCard}>
          <h3 style={styles.sectionTitle}>1. Objetivo</h3>
          <p style={styles.sectionContent}>{content.objetivo || "Não definido."}</p>
        </div>

        <div style={styles.sectionCard}>
          <h3 style={styles.sectionTitle}>2. Campo de Aplicação</h3>
          <p style={styles.sectionContent}>{content.campo_aplicacao || "Não definido."}</p>
        </div>

        {content.informacoes_complementares && (
          <div style={styles.sectionCard}>
            <h3 style={styles.sectionTitle}>3. Informações Complementares</h3>
            <p style={styles.sectionContent}>{content.informacoes_complementares}</p>
          </div>
        )}

        <div style={styles.sectionCard}>
          <h3 style={styles.sectionTitle}>4. Fluxo do Processo</h3>
          {content.fluxo_processo && <p style={styles.sectionContent}>{content.fluxo_processo}</p>}
          {content.fluxo_image_url && (
            <img src={content.fluxo_image_url} alt="Fluxograma" style={styles.image} />
          )}
        </div>

        {content.atividades && content.atividades.length > 0 && (
          <div style={styles.sectionCard}>
            <h3 style={styles.sectionTitle}>5. Atividades e Responsabilidades</h3>
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
          <div style={styles.sectionCard}>
            <h3 style={styles.sectionTitle}>6. Matriz de Riscos</h3>
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
          <div style={styles.sectionCard}>
            <h3 style={styles.sectionTitle}>7. Inter-relação entre Áreas</h3>
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
          <div style={styles.sectionCard}>
            <h3 style={styles.sectionTitle}>8. Indicadores de Desempenho</h3>
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
        <p>Gerado em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
        <p>Oficinas Master - Gestão de Processos</p>
        <p style={{ marginTop: '8px', fontWeight: 'bold' }}>Documento Controlado - Uso Interno</p>
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
      {/* Cabeçalho IT */}
      <div style={styles.header}>
        <h1 style={styles.title}>GESTÃO DE PROCESSOS</h1>
        <p style={styles.subtitle}>{it.type} - {it.type === 'IT' ? 'Instrução de Trabalho' : 'Formulário/Registro'}</p>
      </div>

      {/* Linha de Metadados */}
      <div style={styles.metaLine}>
        <span><strong>Código:</strong> {it.code}</span>
        <span><strong>Data/Hora:</strong> {new Date(it.updated_date || it.created_date).toLocaleString('pt-BR')}</span>
        <span style={{ 
          padding: '4px 12px', 
          backgroundColor: it.type === 'IT' ? '#16a34a' : '#ea580c', 
          color: 'white', 
          borderRadius: '4px',
          fontSize: '9pt',
          fontWeight: 'bold'
        }}>{it.status || 'Ativo'}</span>
      </div>

      {/* Linha Vermelha */}
      <div style={styles.redLine}></div>

      {/* Destaque Tipo */}
      <div style={styles.highlightBox}>
        Tipo de Documento: <span style={{ textTransform: 'uppercase' }}>{it.type === 'IT' ? 'INSTRUÇÃO DE TRABALHO' : 'FORMULÁRIO/REGISTRO'}</span>
      </div>

      {/* Tabela de Informações */}
      <table style={styles.infoTable}>
        <thead>
          <tr>
            <th style={styles.tableHeader}>DOCUMENTO</th>
            <th style={styles.tableHeader}>RESPONSÁVEL</th>
            <th style={styles.tableHeader}>VERSÃO</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tableCell}>
              <strong>{it.title}</strong>
              {it.description && <><br /><span style={{ fontSize: '9pt', color: '#666' }}>{it.description}</span></>}
            </td>
            <td style={styles.tableCell}>
              {it.created_by || 'Não definido'}
            </td>
            <td style={styles.tableCell}>
              Versão {it.version || "1"}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Seções em Cards */}
      <div style={styles.sectionCard}>
        <h3 style={styles.sectionTitle}>1. Objetivo</h3>
        <p style={styles.sectionContent}>{content.objetivo || "Não definido."}</p>
      </div>

      <div style={styles.sectionCard}>
        <h3 style={styles.sectionTitle}>2. Campo de Aplicação</h3>
        <p style={styles.sectionContent}>{content.campo_aplicacao || "Não definido."}</p>
      </div>

      {content.informacoes_complementares && (
        <div style={styles.sectionCard}>
          <h3 style={styles.sectionTitle}>3. Informações Complementares</h3>
          <p style={styles.sectionContent}>{content.informacoes_complementares}</p>
        </div>
      )}

      <div style={styles.sectionCard}>
        <h3 style={styles.sectionTitle}>4. Fluxo de Execução</h3>
        {content.fluxo_descricao && <p style={styles.sectionContent}>{content.fluxo_descricao}</p>}
        {content.fluxo_image_url && (
          <img src={content.fluxo_image_url} alt="Fluxograma IT" style={{...styles.image, maxHeight: '150mm'}} />
        )}
      </div>

      {content.atividades && content.atividades.length > 0 && (
        <div style={styles.sectionCard}>
          <h3 style={styles.sectionTitle}>5. Atividades e Responsabilidades</h3>
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
        <div style={styles.sectionCard}>
          <h3 style={styles.sectionTitle}>6. Matriz de Riscos</h3>
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
        <div style={styles.sectionCard}>
          <h3 style={styles.sectionTitle}>7. Inter-relações</h3>
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
        <div style={styles.sectionCard}>
          <h3 style={styles.sectionTitle}>8. Indicadores</h3>
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
        <div style={styles.sectionCard}>
          <h3 style={styles.sectionTitle}>9. Evidência de Execução</h3>
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
        <p>Gerado em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
        <p>Oficinas Master - {it.type} {it.code}</p>
        <p style={{ marginTop: '8px', fontWeight: 'bold' }}>Documento Controlado - Uso Interno</p>
      </footer>
    </div>
  );
}