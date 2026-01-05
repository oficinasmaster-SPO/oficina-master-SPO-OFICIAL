import React from "react";
import { Card } from "@/components/ui/card";

const categories = [
  { key: "dia_1", label: "Dia 1", color: "bg-blue-500" },
  { key: "semana_1", label: "Semana 1", color: "bg-green-500" },
  { key: "30_dias", label: "30 Dias", color: "bg-yellow-500" },
  { key: "60_dias", label: "60 Dias", color: "bg-orange-500" },
  { key: "90_dias", label: "90 Dias", color: "bg-purple-500" }
];

export default function OnboardingTimeline({ onboarding }) {
  return (
    <Card className="p-6">
      <h3 className="font-bold text-lg mb-4">Timeline de Integração</h3>
      <div className="space-y-4">
        {categories.map((cat) => {
          const items = onboarding.items.filter(i => i.category === cat.key);
          const completed = items.filter(i => i.completed).length;
          
          return (
            <div key={cat.key} className="flex items-center gap-4">
              <div className={`w-3 h-3 rounded-full ${cat.color}`} />
              <div className="flex-1">
                <div className="flex justify-between">
                  <span className="font-medium">{cat.label}</span>
                  <span className="text-sm text-gray-600">{completed}/{items.length}</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full mt-1">
                  <div 
                    className={`h-full ${cat.color} rounded-full transition-all`}
                    style={{ width: `${items.length > 0 ? (completed / items.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}