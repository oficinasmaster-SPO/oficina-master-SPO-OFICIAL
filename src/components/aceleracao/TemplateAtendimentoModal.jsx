import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, FileText, Clock } from "lucide-react";

export default function TemplateAtendimentoModal({ onClose, onSelect }) {
  const templates = [
    {
      id: 1,
      nome: "Diagnóstico Inicial",
      tipo: "diagnostico_inicial",
      duracao: 120,
      pauta: [
        { titulo: "Apresentação da Metodologia", descricao: "Explicar o processo de aceleração", tempo_estimado: 15 },
        { titulo: "Levantamento de Dados", descricao: "Coletar informações sobre a oficina", tempo_estimado: 30 },
        { titulo: "Análise SWOT", descricao: "Identificar forças, fraquezas, oportunidades e ameaças", tempo_estimado: 45 },
        { titulo: "Definição de Objetivos", descricao: "Estabelecer metas iniciais", tempo_estimado: 30 }
      ],
      objetivos: [
        "Conhecer a realidade da oficina",
        "Identificar principais desafios",
        "Estabelecer baseline de métricas"
      ]
    },
    {
      id: 2,
      nome: "Acompanhamento Mensal",
      tipo: "acompanhamento_mensal",
      duracao: 60,
      pauta: [
        { titulo: "Revisão de Metas", descricao: "Análise do desempenho do mês", tempo_estimado: 20 },
        { titulo: "Discussão de Desafios", descricao: "Identificar obstáculos e propor soluções", tempo_estimado: 25 },
        { titulo: "Próximos Passos", descricao: "Definir ações para o próximo mês", tempo_estimado: 15 }
      ],
      objetivos: [
        "Avaliar progresso em relação às metas",
        "Resolver bloqueios identificados",
        "Planejar próximo ciclo"
      ]
    },
    {
      id: 3,
      nome: "Revisão de Metas Trimestrais",
      tipo: "revisao_metas",
      duracao: 90,
      pauta: [
        { titulo: "Análise de Resultados", descricao: "Revisão dos últimos 3 meses", tempo_estimado: 30 },
        { titulo: "Ajuste de Estratégias", descricao: "Adequar plano conforme necessário", tempo_estimado: 30 },
        { titulo: "Planejamento Trimestre", descricao: "Definir foco para próximos 3 meses", tempo_estimado: 30 }
      ],
      objetivos: [
        "Avaliar cumprimento de metas trimestrais",
        "Ajustar estratégia se necessário",
        "Definir novas metas"
      ]
    },
    {
      id: 4,
      nome: "Treinamento de Equipe",
      tipo: "treinamento",
      duracao: 180,
      pauta: [
        { titulo: "Abertura e Contexto", descricao: "Apresentar objetivo do treinamento", tempo_estimado: 15 },
        { titulo: "Conteúdo Teórico", descricao: "Exposição de conceitos", tempo_estimado: 60 },
        { titulo: "Prática e Exercícios", descricao: "Aplicação prática", tempo_estimado: 75 },
        { titulo: "Fechamento e Q&A", descricao: "Dúvidas e próximos passos", tempo_estimado: 30 }
      ],
      objetivos: [
        "Capacitar equipe em habilidade específica",
        "Promover alinhamento de processos",
        "Aumentar engajamento da equipe"
      ]
    },
    {
      id: 5,
      nome: "Auditoria de Processos",
      tipo: "auditoria",
      duracao: 120,
      pauta: [
        { titulo: "Mapeamento de Processos", descricao: "Documentar processos atuais", tempo_estimado: 40 },
        { titulo: "Identificação de Gaps", descricao: "Analisar desvios e falhas", tempo_estimado: 40 },
        { titulo: "Recomendações", descricao: "Propor melhorias", tempo_estimado: 40 }
      ],
      objetivos: [
        "Avaliar conformidade de processos",
        "Identificar oportunidades de melhoria",
        "Documentar procedimentos"
      ]
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-5xl max-h-[90vh] overflow-auto">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle>Selecionar Template de Atendimento</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{template.nome}</CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          {template.duracao}min
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          <FileText className="w-3 h-3 mr-1" />
                          {template.pauta.length} tópicos
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-1">Pauta:</p>
                      <ul className="text-xs text-gray-600 space-y-1">
                        {template.pauta.slice(0, 3).map((item, idx) => (
                          <li key={idx}>• {item.titulo}</li>
                        ))}
                        {template.pauta.length > 3 && (
                          <li className="text-gray-400">+ {template.pauta.length - 3} mais...</li>
                        )}
                      </ul>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-1">Objetivos:</p>
                      <ul className="text-xs text-gray-600 space-y-1">
                        {template.objetivos.slice(0, 2).map((obj, idx) => (
                          <li key={idx}>• {obj}</li>
                        ))}
                      </ul>
                    </div>

                    <Button
                      className="w-full mt-3"
                      onClick={() => onSelect(template)}
                    >
                      Usar este Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}