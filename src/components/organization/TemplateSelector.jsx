import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";

const TEMPLATES = [
  {
    id: "small",
    name: "Oficina Pequena",
    description: "Estrutura simples: Sócios → Gerente → Áreas básicas",
    nodes: [
      { node_id: "socios", title: "SÓCIOS", area: "diretoria", level: 1, parent_node_id: null, color: "#EF4444", order: 0 },
      { node_id: "gerente", title: "GERENTE GERAL", area: "diretoria", level: 2, parent_node_id: "socios", color: "#EF4444", order: 0 },
      { node_id: "vendas", title: "VENDAS", area: "vendas", level: 3, parent_node_id: "gerente", color: "#EF4444", order: 0 },
      { node_id: "comercial", title: "COMERCIAL", area: "comercial", level: 3, parent_node_id: "gerente", color: "#EF4444", order: 1 },
      { node_id: "financeiro", title: "FINANCEIRO", area: "financeiro", level: 3, parent_node_id: "gerente", color: "#EF4444", order: 2 },
      { node_id: "tecnico1", title: "TÉCNICO", area: "tecnico", level: 4, parent_node_id: "vendas", color: "#EF4444", order: 0 },
      { node_id: "tecnico2", title: "TÉCNICO", area: "tecnico", level: 4, parent_node_id: "vendas", color: "#EF4444", order: 1 },
    ]
  },
  {
    id: "medium",
    name: "Oficina Média",
    description: "Com Marketing, Estoque e líderes de área",
    nodes: [
      { node_id: "socios", title: "SÓCIOS", area: "diretoria", level: 1, parent_node_id: null, color: "#EF4444", order: 0 },
      { node_id: "gerente", title: "GERENTE GERAL", area: "diretoria", level: 2, parent_node_id: "socios", color: "#EF4444", order: 0 },
      { node_id: "vendas", title: "VENDAS", area: "vendas", level: 3, parent_node_id: "gerente", color: "#EF4444", order: 0 },
      { node_id: "comercial", title: "COMERCIAL", area: "comercial", level: 3, parent_node_id: "gerente", color: "#EF4444", order: 1 },
      { node_id: "marketing", title: "MARKETING", area: "marketing", level: 3, parent_node_id: "gerente", color: "#EF4444", order: 2 },
      { node_id: "financeiro", title: "FINANCEIRO", area: "financeiro", level: 3, parent_node_id: "gerente", color: "#EF4444", order: 3 },
      { node_id: "estoque", title: "ESTOQUE", area: "estoque", level: 3, parent_node_id: "gerente", color: "#EF4444", order: 4 },
      { node_id: "operacao", title: "OPERAÇÃO", area: "operacao", level: 3, parent_node_id: "gerente", color: "#EF4444", order: 5 },
      { node_id: "lider_vendas", title: "Líder de Vendas", area: "vendas", level: 4, parent_node_id: "vendas", color: "#EF4444", order: 0 },
      { node_id: "lider_comercial", title: "Líder Comercial", area: "comercial", level: 4, parent_node_id: "comercial", color: "#EF4444", order: 0 },
      { node_id: "lider_marketing", title: "Líder Marketing", area: "marketing", level: 4, parent_node_id: "marketing", color: "#EF4444", order: 0 },
      { node_id: "lider_tecnico", title: "Líder Técnico", area: "tecnico", level: 4, parent_node_id: "operacao", color: "#EF4444", order: 0 },
    ]
  },
  {
    id: "large",
    name: "Holding/Rede",
    description: "Estrutura completa com Diretor, Gerentes e Unidades",
    nodes: [
      { node_id: "conselho", title: "CONSELHO / SÓCIOS", area: "diretoria", level: 1, parent_node_id: null, color: "#EF4444", order: 0 },
      { node_id: "diretor", title: "DIRETOR GERAL", area: "diretoria", level: 2, parent_node_id: "conselho", color: "#EF4444", order: 0 },
      { node_id: "ger_vendas", title: "GER. VENDAS", area: "vendas", level: 3, parent_node_id: "diretor", color: "#EF4444", order: 0 },
      { node_id: "ger_comercial", title: "GER. COMERCIAL", area: "comercial", level: 3, parent_node_id: "diretor", color: "#EF4444", order: 1 },
      { node_id: "ger_marketing", title: "GER. MARKETING", area: "marketing", level: 3, parent_node_id: "diretor", color: "#EF4444", order: 2 },
      { node_id: "ger_financeiro", title: "GER. FINANCEIRO", area: "financeiro", level: 3, parent_node_id: "diretor", color: "#EF4444", order: 3 },
      { node_id: "ger_estoque", title: "GER. ESTOQUE", area: "estoque", level: 3, parent_node_id: "diretor", color: "#EF4444", order: 4 },
      { node_id: "ger_operacoes", title: "GER. OPERAÇÕES", area: "operacao", level: 3, parent_node_id: "diretor", color: "#EF4444", order: 5 },
      { node_id: "ger_unidade", title: "GERENTE DE UNIDADE", area: "diretoria", level: 4, parent_node_id: "ger_operacoes", color: "#3B82F6", order: 0 },
      { node_id: "lider_vendas", title: "LÍDER VENDAS", area: "vendas", level: 5, parent_node_id: "ger_unidade", color: "#10B981", order: 0 },
      { node_id: "lider_comercial", title: "LÍDER COMERCIAL", area: "comercial", level: 5, parent_node_id: "ger_unidade", color: "#10B981", order: 1 },
      { node_id: "lider_marketing", title: "LÍDER MARKETING", area: "marketing", level: 5, parent_node_id: "ger_unidade", color: "#10B981", order: 2 },
      { node_id: "lider_financeiro", title: "LÍDER FINANCEIRO", area: "financeiro", level: 5, parent_node_id: "ger_unidade", color: "#10B981", order: 3 },
      { node_id: "lider_estoque", title: "LÍDER ESTOQUE", area: "estoque", level: 5, parent_node_id: "ger_unidade", color: "#10B981", order: 4 },
      { node_id: "lider_tecnico", title: "LÍDER TÉCNICO", area: "tecnico", level: 5, parent_node_id: "ger_unidade", color: "#10B981", order: 5 },
    ]
  }
];

export default function TemplateSelector({ onApply, onCancel }) {
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const handleApply = () => {
    if (selectedTemplate) {
      onApply(selectedTemplate.nodes);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Escolha um Template</h3>
        <p className="text-sm text-gray-600">
          Selecione uma estrutura pré-definida como ponto de partida. Você poderá editá-la depois.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TEMPLATES.map(template => (
          <Card
            key={template.id}
            className={`cursor-pointer transition-all ${
              selectedTemplate?.id === template.id
                ? 'border-blue-600 bg-blue-50'
                : 'hover:border-gray-400'
            }`}
            onClick={() => setSelectedTemplate(template)}
          >
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                {template.name}
                {selectedTemplate?.id === template.id && (
                  <Check className="w-5 h-5 text-blue-600" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">{template.description}</p>
              <div className="mt-4 text-xs text-gray-500">
                {template.nodes.length} posições
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={handleApply} disabled={!selectedTemplate}>
          Aplicar Template
        </Button>
      </div>
    </div>
  );
}