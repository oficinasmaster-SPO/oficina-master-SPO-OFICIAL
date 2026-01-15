import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertCircle, CheckCircle, AlertTriangle, TrendingUp, Calendar, Target, Users, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function FeedbackMetaModal({ open, onClose, status, metricName, realizadoAcumulado, metaAcumulada }) {
  const irm = metaAcumulada > 0 ? realizadoAcumulado / metaAcumulada : 0;
  const percentual = ((irm - 1) * 100).toFixed(1);
  
  const feedbackConfig = {
    acima: {
      icon: <CheckCircle className="w-16 h-16 text-green-500" />,
      cor: "bg-green-50 border-green-200",
      titulo: "🟢 ACIMA DA META",
      descricao: "Ritmo saudável e margem de segurança!",
      acoes: [
        {
          titulo: "Otimizar Agenda",
          icone: <Calendar className="w-5 h-5 text-green-600" />,
          desc: "Aproveite o ritmo positivo para organizar melhor sua agenda. Evite sobrecarga e mantenha qualidade."
        },
        {
          titulo: "Revisar Mix de Produtos/Serviços",
          icone: <Target className="w-5 h-5 text-green-600" />,
          desc: "Analise quais produtos/serviços estão performando melhor e ajuste seu foco comercial."
        },
        {
          titulo: "Aumentar Margem",
          icone: <TrendingUp className="w-5 h-5 text-green-600" />,
          desc: "Com ritmo confortável, analise oportunidades de melhorar margem sem comprometer volume."
        },
        {
          titulo: "Investir em Capacitação",
          icone: <Users className="w-5 h-5 text-green-600" />,
          desc: "Use o momento positivo para treinar equipe e preparar expansão."
        }
      ]
    },
    na_media: {
      icon: <AlertTriangle className="w-16 h-16 text-yellow-500" />,
      cor: "bg-yellow-50 border-yellow-200",
      titulo: "🟡 NA MÉDIA",
      descricao: "Ritmo correto. Atenção para não perder tração!",
      acoes: [
        {
          titulo: "Manter Ritmo Atual",
          icone: <Target className="w-5 h-5 text-yellow-600" />,
          desc: "Continue executando o planejado. Não há necessidade de ações emergenciais, mas fique atento."
        },
        {
          titulo: "Revisar Agenda Semanal",
          icone: <Calendar className="w-5 h-5 text-yellow-600" />,
          desc: "Certifique-se de que a agenda está cheia e bem distribuída para os próximos dias."
        },
        {
          titulo: "Follow-up Preventivo",
          icone: <Users className="w-5 h-5 text-yellow-600" />,
          desc: "Faça contato proativo com clientes agendados para garantir conversão."
        },
        {
          titulo: "Monitorar Indicadores Diários",
          icone: <TrendingUp className="w-5 h-5 text-yellow-600" />,
          desc: "Acompanhe diariamente para identificar desvios antes que se tornem problemas."
        }
      ]
    },
    abaixo: {
      icon: <AlertCircle className="w-16 h-16 text-red-500" />,
      cor: "bg-red-50 border-red-200",
      titulo: "🔴 ABAIXO DA META",
      descricao: "Alerta! Necessidade de ajuste imediato.",
      acoes: [
        {
          titulo: "🚨 URGENTE: Intensificar Agenda",
          icone: <Calendar className="w-5 h-5 text-red-600" />,
          desc: "Aumente volume de agendamentos imediatamente. Entre em contato com base ativa e prospects quentes."
        },
        {
          titulo: "Revisar Ofertas e Promoções",
          icone: <DollarSign className="w-5 h-5 text-red-600" />,
          desc: "Considere criar ofertas especiais ou promoções para acelerar conversão no curto prazo."
        },
        {
          titulo: "Follow-up Agressivo",
          icone: <Users className="w-5 h-5 text-red-600" />,
          desc: "Entre em contato com todos os leads em aberto. Reagende clientes que cancelaram ou não compareceram."
        },
        {
          titulo: "Reunião de Alinhamento",
          icone: <Target className="w-5 h-5 text-red-600" />,
          desc: "Convoque reunião com equipe para diagnosticar gargalos e alinhar ações corretivas imediatas."
        },
        {
          titulo: "Análise de Capacidade Produtiva",
          icone: <TrendingUp className="w-5 h-5 text-red-600" />,
          desc: "Verifique se há limitações operacionais (falta de técnico, equipamento, peças) que estejam travando entregas."
        }
      ]
    }
  };
  
  const config = feedbackConfig[status] || feedbackConfig.abaixo;
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-4 mb-4">
            {config.icon}
            <div>
              <DialogTitle className="text-2xl">{config.titulo}</DialogTitle>
              <p className="text-gray-600 mt-1">{config.descricao}</p>
            </div>
          </div>
        </DialogHeader>
        
        <Card className={`${config.cor} border-2`}>
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-gray-600 mb-1">Métrica</p>
                <p className="font-bold text-gray-900">{metricName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Realizado Acumulado</p>
                <p className="font-bold text-gray-900">{realizadoAcumulado.toLocaleString("pt-BR")}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Meta Acumulada</p>
                <p className="font-bold text-gray-900">{metaAcumulada.toLocaleString("pt-BR")}</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t text-center">
              <p className="text-sm text-gray-700">
                Índice de Ritmo: <span className="font-bold">{(irm * 100).toFixed(1)}%</span>
                {" "}
                <span className={irm > 1.05 ? "text-green-600" : irm < 0.95 ? "text-red-600" : "text-yellow-600"}>
                  ({percentual > 0 ? "+" : ""}{percentual}% da meta)
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
        
        <div className="mt-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Target className="w-5 h-5" />
            Ações Recomendadas
          </h3>
          <div className="space-y-3">
            {config.acoes.map((acao, index) => (
              <Card key={index} className="border-l-4 border-gray-300 hover:border-blue-500 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">{acao.icone}</div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">{acao.titulo}</h4>
                      <p className="text-sm text-gray-600">{acao.desc}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}