import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ChecklistRenderer({ items = [], selected = [], onChange }) {
  const handleToggle = (index) => {
    const newSelected = selected.includes(index)
      ? selected.filter(i => i !== index)
      : [...selected, index];
    onChange(newSelected);
  };

  // Agrupar por categoria
  const groupedItems = items.reduce((acc, item, index) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push({ ...item, index });
    return acc;
  }, {});

  const totalPoints = items.reduce((sum, item) => sum + (item.points || 1), 0);
  const earnedPoints = selected.reduce((sum, idx) => {
    const item = items[idx];
    return sum + (item?.points || 1);
  }, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
        <span className="text-sm font-medium text-blue-900">Progresso do Checklist</span>
        <Badge className="bg-blue-600 text-white">
          {earnedPoints.toFixed(1)} / {totalPoints.toFixed(1)} pontos
        </Badge>
      </div>

      <div className="space-y-3">
        {Object.entries(groupedItems).map(([category, categoryItems]) => (
          <Card key={category} className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-blue-700 flex items-center justify-between">
                <span>🛠️ {category}</span>
                <Badge variant="outline" className="text-xs">
                  {categoryItems.filter(item => selected.includes(item.index)).length}/{categoryItems.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {categoryItems.map((item) => (
                <div key={item.index} className="flex items-start gap-3 p-2 rounded hover:bg-gray-50 transition-colors">
                  <Checkbox
                    checked={selected.includes(item.index)}
                    onCheckedChange={() => handleToggle(item.index)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <label 
                      className="text-sm text-gray-700 cursor-pointer leading-tight"
                      onClick={() => handleToggle(item.index)}
                    >
                      {item.text}
                    </label>
                    {item.points !== 1 && (
                      <span className="text-xs text-gray-500 ml-2">({item.points} pts)</span>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}