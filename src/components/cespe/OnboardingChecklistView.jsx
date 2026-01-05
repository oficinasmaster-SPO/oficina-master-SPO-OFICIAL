import React from "react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

export default function OnboardingChecklistView({ onboarding, onToggle }) {
  const groupedItems = onboarding.items.reduce((acc, item, idx) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push({ ...item, index: idx });
    return acc;
  }, {});

  const categoryLabels = {
    dia_1: "Dia 1",
    semana_1: "Semana 1",
    "30_dias": "30 Dias",
    "60_dias": "60 Dias",
    "90_dias": "90 Dias"
  };

  return (
    <div className="space-y-4">
      {Object.entries(groupedItems).map(([category, items]) => (
        <Card key={category} className="p-6">
          <h3 className="font-bold text-lg mb-4">{categoryLabels[category]}</h3>
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.index} className="flex items-start gap-3">
                <Checkbox
                  checked={item.completed}
                  onCheckedChange={(checked) => onToggle(item.index, checked)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <p className={`font-medium ${item.completed ? 'line-through text-gray-500' : ''}`}>
                    {item.title}
                  </p>
                  {item.description && (
                    <p className="text-sm text-gray-600">{item.description}</p>
                  )}
                  {item.completed && item.completed_date && (
                    <p className="text-xs text-gray-500 mt-1">
                      Concluído em {new Date(item.completed_date).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}