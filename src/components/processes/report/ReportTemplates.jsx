import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Clipboard, Settings, Users, TrendingUp, CheckCircle2 } from "lucide-react";

const templates = [
  {
    id: "auditoria_inicial",
    name: "Auditoria Inicial",
    icon: Clipboard,
    description: "Primeira visita de diagnóstico",
    color: "bg-blue-100 text-blue-700",
    defaults: {
      objetivo_consultoria: "Realizar diagnóstico inicial da oficina para identificar pontos de melhoria e estabelecer linha de base para acompanhamento.",
      atividades: {
        entrevistas: true,
        analise_documental: true,
        observacao_in_loco: true,
        mapeamento_processos: false,
        avaliacao_indicadores: false,
        outro: false
      }
    }
  },
  {
    id: "acompanhamento",
    name: "Acompanhamento Mensal",
    icon: TrendingUp,
    description: "Visita de follow-up periódico",
    color: "bg-green-100 text-green-700",
    defaults: {
      objetivo_consultoria: "Acompanhar evolução das ações implementadas, verificar indicadores e ajustar plano de ação conforme necessário.",
      atividades: {
        entrevistas: true,
        analise_documental: false,
        observacao_in_loco: true,
        mapeamento_processos: false,
        avaliacao_indicadores: true,
        outro: false
      }
    }
  },
  {
    id: "implementacao_processo",
    name: "Implementação de Processo",
    icon: Settings,
    description: "Implantação de novo processo",
    color: "bg-purple-100 text-purple-700",
    defaults: {
      objetivo_consultoria: "Implementar e validar novo processo operacional, treinar equipe e estabelecer indicadores de controle.",
      atividades: {
        entrevistas: true,
        analise_documental: true,
        observacao_in_loco: true,
        mapeamento_processos: true,
        avaliacao_indicadores: false,
        outro: false
      }
    }
  },
  {
    id: "treinamento",
    name: "Treinamento de Equipe",
    icon: Users,
    description: "Capacitação e desenvolvimento",
    color: "bg-amber-100 text-amber-700",
    defaults: {
      objetivo_consultoria: "Capacitar equipe nos processos e procedimentos definidos, avaliar competências e identificar gaps de conhecimento.",
      atividades: {
        entrevistas: true,
        analise_documental: false,
        observacao_in_loco: true,
        mapeamento_processos: false,
        avaliacao_indicadores: false,
        outro: true
      },
      atividade_outro_texto: "Treinamento prático com a equipe"
    }
  },
  {
    id: "auditoria_certificacao",
    name: "Auditoria de Certificação",
    icon: CheckCircle2,
    description: "Verificação para certificação",
    color: "bg-red-100 text-red-700",
    defaults: {
      objetivo_consultoria: "Avaliar conformidade com requisitos da certificação OM, identificar não conformidades e recomendar ações corretivas.",
      atividades: {
        entrevistas: true,
        analise_documental: true,
        observacao_in_loco: true,
        mapeamento_processos: true,
        avaliacao_indicadores: true,
        outro: false
      }
    }
  }
];

export default function ReportTemplates({ open, onClose, onSelect }) {
  const handleSelect = (template) => {
    onSelect(template.defaults);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Selecionar Template de Relatório
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {templates.map(template => {
            const Icon = template.icon;
            return (
              <Card 
                key={template.id}
                className="cursor-pointer hover:border-blue-500 hover:shadow-md transition-all"
                onClick={() => handleSelect(template)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${template.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{template.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={onClose}>
            Começar em Branco
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { templates };