import React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import ReactMarkdown from "react-markdown";

export default function AtaPrintLayout({ atendimento, workshop }) {
  return (
    <div className="print-content bg-white p-8 max-w-4xl mx-auto">
      {/* Cabeçalho */}
      <div className="border-b-2 border-gray-800 pb-4 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              ATA DE REUNIÃO - CONSULTORIA
            </h1>
            <p className="text-sm text-gray-600">
              Oficinas Master - Programa de Aceleração
            </p>
          </div>
          {workshop?.logo_url && (
            <img src={workshop.logo_url} alt="Logo" className="h-16 object-contain" />
          )}
        </div>
      </div>

      {/* Informações Básicas */}
      <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
        <div>
          <p className="font-semibold text-gray-700">Oficina Cliente:</p>
          <p className="text-gray-900">{workshop?.name || 'Não informado'}</p>
        </div>
        <div>
          <p className="font-semibold text-gray-700">Consultor:</p>
          <p className="text-gray-900">{atendimento.consultor_nome}</p>
        </div>
        <div>
          <p className="font-semibold text-gray-700">Data:</p>
          <p className="text-gray-900">
            {format(new Date(atendimento.data_agendada), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <div>
          <p className="font-semibold text-gray-700">Horário:</p>
          <p className="text-gray-900">
            {format(new Date(atendimento.data_agendada), "HH:mm")} ({atendimento.duracao_minutos}min)
          </p>
        </div>
        <div>
          <p className="font-semibold text-gray-700">Tipo:</p>
          <p className="text-gray-900">{atendimento.tipo_atendimento.replace(/_/g, ' ')}</p>
        </div>
        <div>
          <p className="font-semibold text-gray-700">Status:</p>
          <p className="text-gray-900 capitalize">{atendimento.status}</p>
        </div>
      </div>

      {/* Participantes */}
      {atendimento.participantes && atendimento.participantes.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-300 pb-2">
            Participantes
          </h2>
          <ul className="space-y-1 text-sm">
            {atendimento.participantes.map((p, idx) => (
              <li key={idx} className="text-gray-900">
                • {p.nome} - {p.cargo} ({p.email})
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Pauta */}
      {atendimento.pauta && atendimento.pauta.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-300 pb-2">
            Pauta da Reunião
          </h2>
          <div className="space-y-3">
            {atendimento.pauta.map((item, idx) => (
              <div key={idx} className="text-sm">
                <p className="font-semibold text-gray-900">{idx + 1}. {item.titulo}</p>
                {item.descricao && <p className="text-gray-700 ml-4 mt-1">{item.descricao}</p>}
                {item.tempo_estimado && (
                  <p className="text-gray-600 text-xs ml-4">Tempo estimado: {item.tempo_estimado} min</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Objetivos */}
      {atendimento.objetivos && atendimento.objetivos.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-300 pb-2">
            Objetivos
          </h2>
          <ul className="space-y-1 text-sm">
            {atendimento.objetivos.map((obj, idx) => (
              <li key={idx} className="text-gray-900">• {obj}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Ata Gerada por IA */}
      {atendimento.ata_ia && (
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-300 pb-2">
            Resumo da Reunião
          </h2>
          <div className="prose prose-sm max-w-none text-gray-900">
            <ReactMarkdown>{atendimento.ata_ia}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Decisões Tomadas */}
      {atendimento.decisoes_tomadas && atendimento.decisoes_tomadas.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-300 pb-2">
            Decisões Tomadas
          </h2>
          <div className="space-y-2 text-sm">
            {atendimento.decisoes_tomadas.map((decisao, idx) => (
              <div key={idx} className="border-l-4 border-blue-500 pl-3">
                <p className="font-semibold text-gray-900">{decisao.decisao}</p>
                <p className="text-gray-700">Responsável: {decisao.responsavel}</p>
                {decisao.prazo && (
                  <p className="text-gray-600">
                    Prazo: {format(new Date(decisao.prazo), "dd/MM/yyyy")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ações Geradas */}
      {atendimento.acoes_geradas && atendimento.acoes_geradas.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-300 pb-2">
            Ações de Acompanhamento
          </h2>
          <div className="space-y-2 text-sm">
            {atendimento.acoes_geradas.map((acao, idx) => (
              <div key={idx} className="border-l-4 border-green-500 pl-3">
                <p className="font-semibold text-gray-900">{acao.acao}</p>
                <p className="text-gray-700">Responsável: {acao.responsavel}</p>
                {acao.prazo && (
                  <p className="text-gray-600">
                    Prazo: {format(new Date(acao.prazo), "dd/MM/yyyy")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Processos Vinculados */}
      {atendimento.processos_vinculados && atendimento.processos_vinculados.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-300 pb-2">
            Processos Compartilhados (MAPs)
          </h2>
          <ul className="space-y-1 text-sm">
            {atendimento.processos_vinculados.map((proc, idx) => (
              <li key={idx} className="text-gray-900">
                • {proc.titulo} - {proc.categoria}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Videoaulas Vinculadas */}
      {atendimento.videoaulas_vinculadas && atendimento.videoaulas_vinculadas.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-300 pb-2">
            Videoaulas e Treinamentos
          </h2>
          <ul className="space-y-1 text-sm">
            {atendimento.videoaulas_vinculadas.map((video, idx) => (
              <li key={idx} className="text-gray-900">
                • {video.titulo}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Observações e Próximos Passos */}
      {atendimento.observacoes_consultor && (
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-300 pb-2">
            Observações do Consultor
          </h2>
          <p className="text-sm text-gray-900 whitespace-pre-line">{atendimento.observacoes_consultor}</p>
        </div>
      )}

      {atendimento.proximos_passos && (
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-300 pb-2">
            Próximos Passos
          </h2>
          <p className="text-sm text-gray-900 whitespace-pre-line">{atendimento.proximos_passos}</p>
        </div>
      )}

      {/* Rodapé */}
      <div className="mt-12 pt-6 border-t border-gray-300 text-xs text-gray-600">
        <div className="flex justify-between items-center">
          <div>
            <p>Ata gerada em: {format(new Date(), "dd/MM/yyyy 'às' HH:mm")}</p>
            <p>Oficinas Master - Programa de Aceleração</p>
          </div>
          <div className="text-right">
            <p className="font-semibold">Documento Confidencial</p>
            <p>Uso Interno</p>
          </div>
        </div>
      </div>

      {/* Estilos de Impressão */}
      <style jsx>{`
        @media print {
          .print-content {
            padding: 20mm;
            font-size: 11pt;
          }
          
          h1 {
            font-size: 18pt;
          }
          
          h2 {
            font-size: 14pt;
            page-break-after: avoid;
          }
          
          p, li {
            orphans: 3;
            widows: 3;
          }
          
          .border-b-2 {
            border-bottom: 2pt solid #1f2937;
          }
        }
      `}</style>
    </div>
  );
}