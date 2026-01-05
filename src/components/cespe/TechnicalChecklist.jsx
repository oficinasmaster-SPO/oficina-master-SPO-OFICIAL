import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const CHECKLIST_DATA = {
  conhecimento_tecnico: {
    title: "Checklist 1 - Conhecimento Técnico",
    question: "Você possui conhecimento técnico sobre os itens abaixo?",
    categories: [
      {
        name: "Mecânica",
        items: [
          "Funcionamento do sistema de freios",
          "Funcionamento de suspensão e direção",
          "Funcionamento de embreagem",
          "Funcionamento do sistema de arrefecimento",
          "Funcionamento de correias e sincronismo",
          "Funcionamento de motor e periféricos"
        ]
      },
      {
        name: "Elétrica / Eletrônica",
        items: [
          "Leitura de diagramas elétricos",
          "Funcionamento de sensores e atuadores",
          "Princípios de elétrica automotiva",
          "Comunicação CAN",
          "Funcionamento básico de módulos eletrônicos"
        ]
      },
      {
        name: "Diagnóstico (conceitual)",
        items: [
          "Conceito de causa raiz",
          "Diferença entre defeito e sintoma",
          "Sequência lógica de diagnóstico",
          "Importância de testes antes da troca",
          "Validação pós-reparo"
        ]
      },
      {
        name: "Processo",
        items: [
          "Fluxo da ordem de serviço",
          "Importância do apontamento de tempo",
          "Relação entre produtividade e lucro",
          "Comunicação técnica com consultor"
        ]
      }
    ]
  },
  experiencia_pratica: {
    title: "Checklist 2 - Experiência Prática",
    question: "Você já executou essas atividades na prática, com autonomia?",
    categories: [
      {
        name: "Mecânica",
        items: [
          "Troca de freios (pastilhas/discos)",
          "Substituição de suspensão",
          "Troca de correias",
          "Troca de embreagem",
          "Serviços de arrefecimento",
          "Montagem e desmontagem mecânica"
        ]
      },
      {
        name: "Elétrica / Eletrônica",
        items: [
          "Uso de scanner automotivo",
          "Teste de sensores e atuadores",
          "Diagnóstico elétrico básico",
          "Reset e parametrizações simples",
          "Correção de falhas elétricas comuns"
        ]
      },
      {
        name: "Diagnóstico (prático)",
        items: [
          "Realização de pré-diagnóstico",
          "Execução de testes práticos",
          "Identificação de causa raiz",
          "Confirmação do reparo realizado"
        ]
      },
      {
        name: "Processo",
        items: [
          "Preenchimento correto da OS",
          "Apontamento de tempo",
          "Registro de oportunidades de venda",
          "Cumprimento de prazos"
        ]
      }
    ]
  },
  capacidade_diagnostico: {
    title: "Checklist 3 - Capacidade de Diagnóstico",
    question: "Você se sente capaz de analisar, decidir e orientar nesses cenários?",
    categories: [
      {
        name: "Análise Técnica",
        items: [
          "Identificar falha sem trocar peça",
          "Priorizar testes corretos",
          "Evitar retrabalho",
          "Avaliar riscos técnicos do serviço"
        ]
      },
      {
        name: "Diagnóstico Integrado",
        items: [
          "Cruzar sintomas mecânicos e eletrônicos",
          "Interpretar dados do scanner",
          "Validar falha com teste físico",
          "Confirmar solução antes da entrega"
        ]
      },
      {
        name: "Tomada de Decisão",
        items: [
          "Sugerir solução técnica adequada",
          "Apontar oportunidade de serviço preventivo",
          "Explicar tecnicamente o problema ao consultor",
          "Ajustar estratégia quando o diagnóstico não se confirma"
        ]
      },
      {
        name: "Visão de Negócio",
        items: [
          "Entender impacto do erro técnico no lucro",
          "Respeitar tempo padrão",
          "Contribuir para produtividade do pátio"
        ]
      }
    ]
  }
};

export default function TechnicalChecklist({ 
  checklistType,
  checklistId,
  workshopId,
  criteriaName,
  responses = {}, 
  onChange,
  readonly = false 
}) {
  // Buscar checklist do banco se fornecido ID
  const { data: dbChecklist } = useQuery({
    queryKey: ['technical-checklist', checklistId],
    queryFn: () => base44.entities.TechnicalChecklist.get(checklistId),
    enabled: !!checklistId
  });

  // Buscar checklist por tipo e critério
  const { data: matchedChecklists = [] } = useQuery({
    queryKey: ['matched-checklists', checklistType, criteriaName, workshopId],
    queryFn: async () => {
      if (!workshopId) return [];
      const all = await base44.entities.TechnicalChecklist.filter({ 
        is_active: true,
        checklist_type: checklistType
      });
      
      // Filtrar por critério associado
      return all.filter(c => {
        if (!criteriaName) return true;
        const associated = c.associated_criteria || [];
        return associated.some(keyword => 
          criteriaName.toLowerCase().includes(keyword.toLowerCase())
        );
      });
    },
    enabled: !checklistId && !!workshopId && !!criteriaName
  });

  // Usar checklist do banco se disponível, senão usar hardcoded
  let checklist;
  if (dbChecklist) {
    checklist = {
      title: dbChecklist.checklist_name,
      question: dbChecklist.question_text,
      categories: dbChecklist.categories
    };
  } else if (matchedChecklists.length > 0) {
    const matched = matchedChecklists[0];
    checklist = {
      title: matched.checklist_name,
      question: matched.question_text,
      categories: matched.categories
    };
  } else {
    checklist = CHECKLIST_DATA[checklistType];
  }
  
  if (!checklist) return null;

  const handleToggle = (categoryIndex, itemIndex) => {
    if (readonly) return;
    
    const key = `${categoryIndex}_${itemIndex}`;
    const newResponses = { ...responses, [key]: !responses[key] };
    onChange?.(newResponses);
  };

  const calculateProgress = () => {
    const totalItems = checklist.categories.reduce((sum, cat) => sum + cat.items.length, 0);
    const checkedItems = Object.values(responses).filter(Boolean).length;
    return Math.round((checkedItems / totalItems) * 100);
  };

  const progress = calculateProgress();
  const totalItems = checklist.categories.reduce((sum, cat) => sum + cat.items.length, 0);
  const checkedItems = Object.values(responses).filter(Boolean).length;

  return (
    <Card className="border-2 border-blue-200">
      <CardHeader className="bg-blue-50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-blue-900">{checklist.title}</CardTitle>
          <Badge variant="outline" className="bg-white">
            {checkedItems}/{totalItems} ({progress}%)
          </Badge>
        </div>
        <p className="text-sm text-blue-700 font-medium mt-2">{checklist.question}</p>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {checklist.categories.map((category, catIdx) => (
          <div key={catIdx} className="space-y-3">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              <span className="text-blue-600">🔧</span>
              {category.name}
            </h4>
            <div className="space-y-2 pl-6">
              {category.items.map((item, itemIdx) => {
                const key = `${catIdx}_${itemIdx}`;
                const isChecked = responses[key] || false;
                
                return (
                  <div key={itemIdx} className="flex items-start gap-3 group">
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => handleToggle(catIdx, itemIdx)}
                      disabled={readonly}
                      className="mt-0.5"
                    />
                    <Label 
                      className={`text-sm cursor-pointer flex-1 ${
                        isChecked 
                          ? 'text-green-700 font-medium' 
                          : 'text-gray-700'
                      } ${readonly ? 'cursor-default' : ''}`}
                      onClick={() => !readonly && handleToggle(catIdx, itemIdx)}
                    >
                      {item}
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progresso Total</span>
            <span className="text-sm font-bold text-blue-600">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-blue-600 h-3 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {progress === 100 && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
            <p className="text-sm font-semibold text-green-800">
              ✅ Checklist completo!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export { CHECKLIST_DATA };