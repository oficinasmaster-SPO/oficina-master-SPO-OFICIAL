import React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import ReactMarkdown from "react-markdown";

export default function AtaPrintLayout({ atendimento, workshop }) {
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
      marginBottom: '20px',
      paddingBottom: '15px'
    },
    mainTitle: {
      fontSize: '18pt',
      fontWeight: 'bold',
      margin: '0 0 8px 0',
      textTransform: 'uppercase',
      color: '#000'
    },
    subtitle: {
      fontSize: '13pt',
      margin: '4px 0',
      color: '#000'
    },
    redLine: {
      height: '3px',
      backgroundColor: '#dc2626',
      margin: '15px 0',
      border: 'none'
    },
    metadataGrid: {
      display: 'table',
      width: '100%',
      marginTop: '12px',
      marginBottom: '12px',
      fontSize: '10pt',
      borderCollapse: 'collapse'
    },
    metadataRow: {
      display: 'table-row'
    },
    metadataCell: {
      display: 'table-cell',
      padding: '4px 8px 4px 0',
      verticalAlign: 'top'
    },
    metadataLabel: {
      fontWeight: 'bold',
      color: '#000'
    },
    metadataValue: {
      color: '#000'
    },
    typeSection: {
      marginTop: '15px',
      marginBottom: '15px',
      fontSize: '12pt'
    },
    typeLabel: {
      fontWeight: 'bold',
      color: '#000',
      display: 'inline'
    },
    typeValue: {
      color: '#dc2626',
      textTransform: 'uppercase',
      fontWeight: 'bold',
      display: 'inline',
      marginLeft: '8px'
    },
    infoBox: {
      border: '1px solid #000',
      marginBottom: '15px',
      width: '100%',
      borderCollapse: 'collapse'
    },
    infoBoxHeader: {
      backgroundColor: '#dc2626',
      color: 'white',
      padding: '10px',
      fontWeight: 'bold',
      fontSize: '10pt',
      textTransform: 'uppercase',
      textAlign: 'left',
      border: '1px solid #000'
    },
    infoBoxContent: {
      padding: '12px',
      fontSize: '10pt',
      color: '#000',
      border: '1px solid #000',
      textAlign: 'left'
    },
    sectionTitle: {
      fontSize: '13pt',
      fontWeight: 'bold',
      color: '#000',
      margin: '20px 0 12px 0',
      paddingBottom: '4px',
      borderBottom: '2px solid #000',
      textTransform: 'uppercase',
      textAlign: 'left'
    },
    sectionContent: {
      fontSize: '11pt',
      lineHeight: '1.6',
      color: '#000',
      marginBottom: '16px',
      whiteSpace: 'pre-line',
      textAlign: 'left'
    },
    list: {
      margin: '8px 0',
      paddingLeft: '20px',
      listStyleType: 'disc',
      textAlign: 'left'
    },
    listItem: {
      margin: '4px 0',
      fontSize: '10pt',
      color: '#000',
      textAlign: 'left'
    },
    decisaoBox: {
      borderLeft: '4px solid #2563eb',
      paddingLeft: '12px',
      marginBottom: '12px',
      backgroundColor: '#f0f9ff',
      padding: '12px'
    },
    acaoBox: {
      borderLeft: '4px solid #16a34a',
      paddingLeft: '12px',
      marginBottom: '12px',
      backgroundColor: '#f0fdf4',
      padding: '12px'
    },
    footer: {
      marginTop: '30px',
      paddingTop: '15px',
      borderTop: '1px solid #ccc',
      fontSize: '9pt',
      textAlign: 'center',
      color: '#666',
      pageBreakInside: 'avoid'
    }
  };

  return (
    <div style={styles.container}>
      {/* Cabeçalho Centralizado */}
      <div style={styles.header}>
        {workshop?.logo_url && (
          <img 
            src={workshop.logo_url} 
            alt="Logo" 
            style={{ height: '45px', marginBottom: '12px', display: 'block', margin: '0 auto 12px auto' }} 
          />
        )}
        <h1 style={styles.mainTitle}>GESTÃO DE PROCESSOS</h1>
        <p style={styles.subtitle}>IT - Instrução de Trabalho</p>
      </div>

      {/* Linha de Metadados (Código, Data/Hora, Status) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10pt', marginBottom: '15px' }}>
        <span><strong>Código:</strong> {atendimento.code || 'ATA-' + new Date(atendimento.data_agendada).getTime()}</span>
        <span>
          <strong>Data/Hora:</strong> {format(new Date(atendimento.data_agendada), "dd/MM/yyyy", { locale: ptBR })} / {format(new Date(atendimento.data_agendada), "HH:mm")}
        </span>
        <span style={{ fontWeight: 'bold' }}>{atendimento.status === 'finalizada' ? 'Finalizada' : 'Rascunho'}</span>
      </div>

      <hr style={styles.redLine} />

      {/* Tipo de Aceleração */}
      <div style={styles.typeSection}>
        <span style={styles.typeLabel}>Tipo de Aceleração:</span>
        <span style={styles.typeValue}>{atendimento.tipo_atendimento?.replace(/_/g, ' ').toUpperCase() || 'MENSAL'}</span>
      </div>

      {/* Caixa de Informações - Participantes, Responsável, Plano */}
      <table style={styles.infoBox}>
        <thead>
          <tr>
            <th style={{...styles.infoBoxHeader, width: '40%'}}>PARTICIPANTES</th>
            <th style={{...styles.infoBoxHeader, width: '30%'}}>RESPONSÁVEL</th>
            <th style={{...styles.infoBoxHeader, width: '30%'}}>PLANO</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.infoBoxContent}>
              {atendimento.participantes && atendimento.participantes.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: '15px', listStyleType: 'disc' }}>
                  {atendimento.participantes.map((p, idx) => (
                    <li key={idx} style={{ marginBottom: '4px' }}>
                      {p.nome} - {p.cargo}
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ margin: 0 }}>• Aceleradora Oficinas Master - Consultor/Acelerador</p>
              )}
            </td>
            <td style={styles.infoBoxContent}>
              <p style={{ margin: 0, fontWeight: 'bold' }}>{workshop?.name || 'Oficina Cliente'}</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '9pt', color: '#666' }}>Proprietário</p>
            </td>
            <td style={styles.infoBoxContent}>
              <p style={{ margin: 0 }}>Plano de Aceleração</p>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Seção 1: PAUTAS */}
      <div style={{ pageBreakInside: 'avoid', marginBottom: '20px' }}>
        <h2 style={styles.sectionTitle}>1. PAUTAS</h2>
        {atendimento.pauta && atendimento.pauta.length > 0 ? (
          <div>
            {atendimento.pauta.map((item, idx) => (
              <div key={idx} style={{ marginBottom: '12px' }}>
                <p style={{ fontWeight: 'bold', margin: '4px 0', fontSize: '10pt' }}>
                  {idx + 1}. {item.titulo}
                </p>
                {item.descricao && (
                  <p style={{ marginLeft: '16px', fontSize: '10pt', color: '#333', margin: '4px 0 4px 16px' }}>
                    {item.descricao}
                  </p>
                )}
                {item.tempo_estimado && (
                  <p style={{ marginLeft: '16px', fontSize: '9pt', color: '#666', margin: '2px 0 0 16px' }}>
                    Tempo estimado: {item.tempo_estimado} min
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p style={styles.sectionContent}>{atendimento.pautas || 'Não informado'}</p>
        )}
      </div>

      {/* Seção 2: OBJETIVOS DO ATENDIMENTO */}
      <div style={{ pageBreakInside: 'avoid', marginBottom: '20px' }}>
        <h2 style={styles.sectionTitle}>2. OBJETIVOS DO ATENDIMENTO</h2>
        {atendimento.objetivos && atendimento.objetivos.length > 0 ? (
          <ul style={styles.list}>
            {atendimento.objetivos.map((obj, idx) => (
              <li key={idx} style={styles.listItem}>{obj}</li>
            ))}
          </ul>
        ) : (
          <p style={styles.sectionContent}>{atendimento.objetivos_atendimento || 'Não informado'}</p>
        )}
      </div>

      {/* Seção 3: OBJETIVOS DO CONSULTOR */}
      <div style={{ pageBreakInside: 'avoid', marginBottom: '20px' }}>
        <h2 style={styles.sectionTitle}>3. OBJETIVOS DO CONSULTOR</h2>
        <p style={styles.sectionContent}>{atendimento.objetivos_consultor || 'Não informado'}</p>
      </div>

      {/* Seção 4: PRÓXIMOS PASSOS */}
      <div style={{ pageBreakInside: 'avoid', marginBottom: '20px' }}>
        <h2 style={styles.sectionTitle}>4. PRÓXIMOS PASSOS</h2>
        {atendimento.proximos_passos_list && atendimento.proximos_passos_list.length > 0 ? (
          <div>
            {atendimento.proximos_passos_list.map((passo, idx) => (
              <div key={idx} style={{...styles.acaoBox, marginBottom: '12px'}}>
                <p style={{ fontWeight: 'bold', margin: '0 0 4px 0', fontSize: '10pt' }}>
                  {passo.descricao}
                </p>
                <p style={{ margin: '2px 0', fontSize: '10pt' }}>
                  <strong>Responsável:</strong> {passo.responsavel}
                </p>
                {passo.prazo && (
                  <p style={{ margin: '2px 0', fontSize: '10pt', color: '#666' }}>
                    <strong>Prazo:</strong> {format(new Date(passo.prazo), "dd/MM/yyyy")}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : atendimento.proximos_passos ? (
          <p style={styles.sectionContent}>{atendimento.proximos_passos}</p>
        ) : (
          <p style={styles.sectionContent}>Nenhum próximo passo definido</p>
        )}
      </div>

      {/* Seção 5: RESUMO DA REUNIÃO (se houver ata_ia) */}
      {atendimento.ata_ia && (
        <div style={{ pageBreakInside: 'avoid', marginBottom: '20px' }}>
          <h2 style={styles.sectionTitle}>5. RESUMO DA REUNIÃO</h2>
          <div style={styles.sectionContent}>
            <ReactMarkdown>{atendimento.ata_ia}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Seção 6: DECISÕES TOMADAS */}
      {atendimento.decisoes_tomadas && atendimento.decisoes_tomadas.length > 0 && (
        <div style={{ pageBreakInside: 'avoid', marginBottom: '20px' }}>
          <h2 style={styles.sectionTitle}>6. DECISÕES TOMADAS</h2>
          <div>
            {atendimento.decisoes_tomadas.map((decisao, idx) => (
              <div key={idx} style={{...styles.decisaoBox, marginBottom: '12px'}}>
                <p style={{ fontWeight: 'bold', margin: '0 0 4px 0', fontSize: '10pt' }}>
                  {decisao.decisao}
                </p>
                <p style={{ margin: '2px 0', fontSize: '10pt' }}>
                  <strong>Responsável:</strong> {decisao.responsavel}
                </p>
                {decisao.prazo && (
                  <p style={{ margin: '2px 0', fontSize: '10pt', color: '#666' }}>
                    <strong>Prazo:</strong> {format(new Date(decisao.prazo), "dd/MM/yyyy")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Seção 7: AÇÕES GERADAS */}
      {atendimento.acoes_geradas && atendimento.acoes_geradas.length > 0 && (
        <div style={{ pageBreakInside: 'avoid', marginBottom: '20px' }}>
          <h2 style={styles.sectionTitle}>7. AÇÕES DE ACOMPANHAMENTO</h2>
          <div>
            {atendimento.acoes_geradas.map((acao, idx) => (
              <div key={idx} style={{...styles.acaoBox, marginBottom: '12px'}}>
                <p style={{ fontWeight: 'bold', margin: '0 0 4px 0', fontSize: '10pt' }}>
                  {acao.acao}
                </p>
                <p style={{ margin: '2px 0', fontSize: '10pt' }}>
                  <strong>Responsável:</strong> {acao.responsavel}
                </p>
                {acao.prazo && (
                  <p style={{ margin: '2px 0', fontSize: '10pt', color: '#666' }}>
                    <strong>Prazo:</strong> {format(new Date(acao.prazo), "dd/MM/yyyy")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Seção 8: PROCESSOS VINCULADOS */}
      {atendimento.processos_vinculados && atendimento.processos_vinculados.length > 0 && (
        <div style={{ pageBreakInside: 'avoid', marginBottom: '20px' }}>
          <h2 style={styles.sectionTitle}>8. PROCESSOS COMPARTILHADOS (MAPs)</h2>
          <ul style={styles.list}>
            {atendimento.processos_vinculados.map((proc, idx) => (
              <li key={idx} style={styles.listItem}>
                {proc.titulo} - {proc.categoria}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Seção 9: VIDEOAULAS VINCULADAS */}
      {atendimento.videoaulas_vinculadas && atendimento.videoaulas_vinculadas.length > 0 && (
        <div style={{ pageBreakInside: 'avoid', marginBottom: '20px' }}>
          <h2 style={styles.sectionTitle}>9. VIDEOAULAS E TREINAMENTOS</h2>
          <ul style={styles.list}>
            {atendimento.videoaulas_vinculadas.map((video, idx) => (
              <li key={idx} style={styles.listItem}>{video.titulo}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Seção 10: OBSERVAÇÕES DO CONSULTOR */}
      {atendimento.observacoes_consultor && (
        <div style={{ pageBreakInside: 'avoid', marginBottom: '20px' }}>
          <h2 style={styles.sectionTitle}>10. OBSERVAÇÕES DO CONSULTOR</h2>
          <p style={styles.sectionContent}>{atendimento.observacoes_consultor}</p>
        </div>
      )}

      {/* Seção 11: VISÃO GERAL DO PROJETO */}
      {atendimento.visao_geral_projeto && (
        <div style={{ pageBreakInside: 'avoid', marginBottom: '20px' }}>
          <h2 style={styles.sectionTitle}>11. VISÃO GERAL DO PROJETO DE ACELERAÇÃO</h2>
          <p style={styles.sectionContent}>{atendimento.visao_geral_projeto}</p>
        </div>
      )}

      {/* Rodapé */}
      <div style={styles.footer}>
        <p style={{ margin: '4px 0' }}>
          Documento Controlado - Status: {atendimento.status || 'finalizada'}
        </p>
        <p style={{ margin: '4px 0' }}>
          Oficinas Master - Impresso em {format(new Date(), "dd/MM/yyyy 'às' HH:mm")}
        </p>
      </div>
    </div>
  );
}