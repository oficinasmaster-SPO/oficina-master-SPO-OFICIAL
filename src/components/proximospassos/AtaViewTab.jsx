import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { FileText, ExternalLink, AlertTriangle } from "lucide-react";

export default function AtaViewTab({ passo }) {
  const [ata, setAta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    const fetchAta = async () => {
      try {
        setErro(null);
        
        let ataId = null;

        // PRIORIDADE 1: ata_id direto no passo (novo/resiliente)
        if (passo.ata_id) {
          ataId = passo.ata_id;
        }
        // PRIORIDADE 2: buscar do atendimento (fallback legado)
        else if (passo.consultoria_atendimento_id) {
          try {
            const atendimento = await base44.entities.ConsultoriaAtendimento.get(
              passo.consultoria_atendimento_id
            );
            ataId = atendimento?.ata_id;
          } catch (atendimentoErr) {
            setErro("Atendimento foi deletado e ATA não está vinculada a este passo");
            setLoading(false);
            return;
          }
        } else {
          setErro("Nenhuma ATA vinculada a este próximo passo");
          setLoading(false);
          return;
        }

        if (!ataId) {
          setErro("ATA não foi gerada para este atendimento");
          setLoading(false);
          return;
        }

        const ataData = await base44.entities.MeetingMinutes.get(ataId);
        if (!ataData) {
          setErro("Registro da ATA foi removido ou não está acessível");
          setLoading(false);
          return;
        }

        setAta(ataData);
      } catch (err) {
        console.error('Erro ao buscar ATA:', err);
        setErro(`Erro ao carregar ATA: ${err.message || 'Desconhecido'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchAta();
  }, [passo.ata_id, passo.consultoria_atendimento_id]);

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-lg" />)}
      </div>
    );
  }

  if (erro) {
    return (
      <div className="text-center py-8 px-4">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <p className="text-red-600 text-sm font-medium">{erro}</p>
      </div>
    );
  }

  if (!ata) {
    return (
      <div className="text-center py-8">
        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">ATA não encontrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header da ATA */}
      <div className="border-b border-gray-200 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              ATA #{ata.code}
            </h3>
            {ata.meeting_date && (
              <p className="text-xs text-gray-500 mt-1">
                📅 {format(new Date(ata.meeting_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            )}
          </div>
        </div>
      </div>
      
      {/* Conteúdo da ATA (Markdown com scroll) */}
      {ata.ata_ia && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 max-h-96 overflow-y-auto">
          <ReactMarkdown className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 text-gray-700">
            {ata.ata_ia}
          </ReactMarkdown>
        </div>
      )}
      
      {/* Próximos passos da ATA (se existir) */}
      {ata.proximos_passos_list && ata.proximos_passos_list.length > 0 && (
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-sm text-gray-900 mb-2">Próximos passos da ATA</h4>
          <ul className="space-y-2">
            {ata.proximos_passos_list.map((passo, idx) => (
              <li key={idx} className="text-xs bg-gray-50 rounded p-2">
                <p className="font-medium text-gray-900">{passo.descricao}</p>
                <p className="text-gray-500 mt-1">Responsável: {passo.responsavel || "—"}</p>
                {passo.prazo && (
                  <p className="text-gray-500">Prazo: {format(new Date(passo.prazo), "dd/MM/yyyy", { locale: ptBR })}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Botão para abrir ATA em tela cheia */}
      <Button 
        size="sm" 
        variant="outline"
        className="w-full text-xs gap-1.5"
        onClick={() => {
          window.open(`/ControleAceleracao?tab=atendimentos&modal=ata&ata_id=${ata.id}`, '_blank');
        }}
      >
        <ExternalLink className="w-3.5 h-3.5" />
        Ver ATA Completa
      </Button>
    </div>
  );
}