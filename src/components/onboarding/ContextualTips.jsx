import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

const tips = {
  home: [
    "💡 Primeiro acesso? Comece cadastrando sua oficina para personalizar seu diagnóstico!",
    "🎯 O diagnóstico leva apenas 5-7 minutos e é totalmente gratuito.",
    "📊 Você pode fazer diagnósticos periódicos para acompanhar a evolução da sua oficina."
  ],
  cadastro: [
    "✅ Preencha o máximo de informações possível - quanto mais dados, melhor será a análise!",
    "🔍 Use o botão 'Buscar CEP' para preencher automaticamente o endereço.",
    "💼 Estes dados são confidenciais e usados apenas para personalizar seu plano de ação."
  ],
  questionario: [
    "🎯 Seja sincero nas respostas - não existem respostas certas ou erradas!",
    "⏱️ Você pode voltar e alterar respostas anteriores antes de finalizar.",
    "💡 Responda pensando na situação ATUAL da sua oficina, não no que você gostaria que fosse."
  ],
  resultado: [
    "📊 Sua fase foi identificada com base na letra predominante nas respostas.",
    "🔄 É normal ter características de múltiplas fases - isso mostra áreas de oportunidade!",
    "🎯 O próximo passo é acessar o Plano de Ação completo com sugestões personalizadas."
  ],
  planoacao: [
    "🤖 As sugestões com IA analisam profundamente seu diagnóstico e perfil.",
    "✅ Você pode adicionar subtarefas e responsáveis para cada ação.",
    "📥 Baixe o PDF para compartilhar com sua equipe ou consultor.",
    "🔔 Configure notificações para não perder prazos importantes."
  ],
  historico: [
    "📈 Compare diagnósticos ao longo do tempo para ver sua evolução.",
    "🔍 Use os filtros para encontrar diagnósticos específicos rapidamente.",
    "💾 Todos os diagnósticos ficam salvos - você pode acessá-los quando quiser."
  ],
  notificacoes: [
    "🔔 As notificações são atualizadas automaticamente.",
    "⏰ Você receberá alertas quando tarefas estiverem próximas do prazo.",
    "✅ Marque notificações como lidas para manter tudo organizado."
  ],
  dashboard: [
    "📊 Use os filtros de período para análises mais precisas.",
    "🎯 Compare desempenho por região e segmento.",
    "📈 As métricas são atualizadas em tempo real."
  ]
};

export default function ContextualTips({ page }) {
  const [isVisible, setIsVisible] = useState(true);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  const pageTips = tips[page] || [];

  if (!isVisible || pageTips.length === 0) return null;

  const currentTip = pageTips[currentTipIndex];

  const nextTip = () => {
    setCurrentTipIndex((prev) => (prev + 1) % pageTips.length);
  };

  return (
    <div className="fixed bottom-6 left-6 z-40 max-w-md animate-in slide-in-from-left duration-300">
      <Card className="shadow-2xl border-2 border-yellow-400 bg-gradient-to-br from-yellow-50 to-amber-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-white" />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-yellow-900 mb-1">
                Dica Rápida
              </p>
              <p className="text-sm text-yellow-800 leading-relaxed">
                {currentTip}
              </p>
              
              {pageTips.length > 1 && (
                <div className="flex items-center gap-2 mt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={nextTip}
                    className="text-yellow-700 hover:text-yellow-900 hover:bg-yellow-100"
                  >
                    Próxima dica →
                  </Button>
                  <span className="text-xs text-yellow-600">
                    {currentTipIndex + 1}/{pageTips.length}
                  </span>
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsVisible(false)}
              className="flex-shrink-0 text-yellow-700 hover:text-yellow-900 hover:bg-yellow-100"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}