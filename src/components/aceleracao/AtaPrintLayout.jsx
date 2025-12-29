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
      marginBottom: '20px',
      paddingBottom: '15px',
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
      fontSize: '14pt',
      fontWeight: 'bold',
      margin: '20px 0 12px 0',
      paddingBottom: '4px',
      borderBottom: '2px solid #000',
      textTransform: 'uppercase',
      color: '#000'
    },
    subtitle: {
      fontSize: '10pt',
      margin: '4px 0',
      color: '#666'
    },
    metadata: {
      fontSize: '10pt',
      margin: '15px 0 0 0',
      lineHeight: '1.8'
    },
    metadataItem: {
      margin: '3px 0',
      color: '#000'
    },
    section: {
      marginBottom: '24px',
      textAlign: 'left',
      pageBreakInside: 'avoid'
    },
    content: {
      fontSize: '11pt',
      lineHeight: '1.6',
      color: '#000',
      marginBottom: '16px',
      whiteSpace: 'pre-line',
      textAlign: 'left'
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
    decisao: {
      borderLeft: '4px solid #2563eb',
      paddingLeft: '12px',
      marginBottom: '12px',
      backgroundColor: '#f0f9ff'
    },
    acao: {
      borderLeft: '4px solid #16a34a',
      paddingLeft: '12px',
      marginBottom: '12px',
      backgroundColor: '#f0fdf4'
    },
    footer: {
      marginTop: '30px',
      paddingTop: '15px',
      borderTop: '1px solid #ccc',
      fontSize: '9pt',
      textAlign: 'center',
      color: '#666'
    }
  };

  return (
    <div style={styles.container}>
      {/* Cabeçalho */}
      <div style={styles.header}>
        {workshop?.logo_url && (
          <img src={workshop.logo_url} alt="Logo" style={{ height: '45px', marginBottom: '12px' }} />
        )}
        <h1 style={styles.h1}>ATA DE REUNIÃO - CONSULTORIA</h1>
        <p style={styles.subtitle}>Oficinas Master - Programa de Aceleração</p>
      </div>

      {/* Informações Básicas */}
      <div style={styles.metadata}>
        <p style={styles.metadataItem}><strong>Oficina Cliente:</strong> {workshop?.name || 'Não informado'}</p>
        <p style={styles.metadataItem}><strong>Consultor:</strong> {atendimento.consultor_nome}</p>
        <p style={styles.metadataItem}>
          <strong>Data:</strong> {format(new Date(atendimento.data_agendada), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
        <p style={styles.metadataItem}>
          <strong>Horário:</strong> {format(new Date(atendimento.data_agendada), "HH:mm")} ({atendimento.duracao_minutos}min)
        </p>
        <p style={styles.metadataItem}><strong>Tipo:</strong> {atendimento.tipo_atendimento.replace(/_/g, ' ')}</p>
        <p style={styles.metadataItem}><strong>Status:</strong> {atendimento.status}</p>
      </div>

      {/* Participantes */}
      {atendimento.participantes && atendimento.participantes.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.h2}>Participantes</h2>
          <ul style={styles.list}>
            {atendimento.participantes.map((p, idx) => (
              <li key={idx} style={styles.listItem}>
                {p.nome} - {p.cargo} ({p.email})
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Pauta */}
      {atendimento.pauta && atendimento.pauta.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.h2}>Pauta da Reunião</h2>
          <div>
            {atendimento.pauta.map((item, idx) => (
              <div key={idx} style={{ marginBottom: '12px' }}>
                <p style={{ fontWeight: 'bold', margin: '4px 0', fontSize: '10pt' }}>
                  {idx + 1}. {item.titulo}
                </p>
                {item.descricao && (
                  <p style={{ marginLeft: '16px', fontSize: '10pt', color: '#333' }}>{item.descricao}</p>
                )}
                {item.tempo_estimado && (
                  <p style={{ marginLeft: '16px', fontSize: '9pt', color: '#666' }}>
                    Tempo estimado: {item.tempo_estimado} min
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Objetivos */}
      {atendimento.objetivos && atendimento.objetivos.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.h2}>Objetivos</h2>
          <ul style={styles.list}>
            {atendimento.objetivos.map((obj, idx) => (
              <li key={idx} style={styles.listItem}>{obj}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Resumo da Reunião */}
      {atendimento.ata_ia && (
        <div style={styles.section}>
          <h2 style={styles.h2}>Resumo da Reunião</h2>
          <div style={styles.content}>
            <ReactMarkdown>{atendimento.ata_ia}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Decisões Tomadas */}
      {atendimento.decisoes_tomadas && atendimento.decisoes_tomadas.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.h2}>Decisões Tomadas</h2>
          <div>
            {atendimento.decisoes_tomadas.map((decisao, idx) => (
              <div key={idx} style={{...styles.decisao, padding: '12px', marginBottom: '12px'}}>
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

      {/* Ações Geradas */}
      {atendimento.acoes_geradas && atendimento.acoes_geradas.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.h2}>Ações de Acompanhamento</h2>
          <div>
            {atendimento.acoes_geradas.map((acao, idx) => (
              <div key={idx} style={{...styles.acao, padding: '12px', marginBottom: '12px'}}>
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

      {/* Processos Vinculados */}
      {atendimento.processos_vinculados && atendimento.processos_vinculados.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.h2}>Processos Compartilhados (MAPs)</h2>
          <ul style={styles.list}>
            {atendimento.processos_vinculados.map((proc, idx) => (
              <li key={idx} style={styles.listItem}>
                {proc.titulo} - {proc.categoria}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Videoaulas Vinculadas */}
      {atendimento.videoaulas_vinculadas && atendimento.videoaulas_vinculadas.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.h2}>Videoaulas e Treinamentos</h2>
          <ul style={styles.list}>
            {atendimento.videoaulas_vinculadas.map((video, idx) => (
              <li key={idx} style={styles.listItem}>{video.titulo}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Observações e Próximos Passos */}
      {atendimento.observacoes_consultor && (
        <div style={styles.section}>
          <h2 style={styles.h2}>Observações do Consultor</h2>
          <p style={styles.content}>{atendimento.observacoes_consultor}</p>
        </div>
      )}

      {atendimento.proximos_passos && (
        <div style={styles.section}>
          <h2 style={styles.h2}>Próximos Passos</h2>
          <p style={styles.content}>{atendimento.proximos_passos}</p>
        </div>
      )}

      {/* Rodapé */}
      <div style={styles.footer}>
        <p>Ata gerada em: {format(new Date(), "dd/MM/yyyy 'às' HH:mm")}</p>
        <p>Oficinas Master - Programa de Aceleração</p>
        <p style={{ marginTop: '8px', fontWeight: 'bold' }}>Documento Confidencial - Uso Interno</p>
      </div>
    </div>
  );
}