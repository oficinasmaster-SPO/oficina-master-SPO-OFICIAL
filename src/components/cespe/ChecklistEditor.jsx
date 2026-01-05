import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, GripVertical } from "lucide-react";

export default function ChecklistEditor({ items = [], onChange }) {
  const [newItem, setNewItem] = useState({ category: "", text: "", points: 1 });

  const handleAddItem = () => {
    if (!newItem.category.trim() || !newItem.text.trim()) return;
    
    onChange([...items, { ...newItem }]);
    setNewItem({ category: "", text: "", points: 1 });
  };

  const handleRemoveItem = (index) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index, field, value) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  // Agrupar por categoria
  const groupedItems = items.reduce((acc, item, index) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push({ ...item, originalIndex: index });
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Adicionar Item ao Checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Categoria</Label>
              <Input
                placeholder="Ex: Mecânica"
                value={newItem.category}
                onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                className="text-sm"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Texto do Item</Label>
              <Input
                placeholder="Ex: Funcionamento do sistema de freios"
                value={newItem.text}
                onChange={(e) => setNewItem({ ...newItem, text: e.target.value })}
                className="text-sm"
              />
            </div>
          </div>
          <Button onClick={handleAddItem} size="sm" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Item
          </Button>
        </CardContent>
      </Card>

      {Object.keys(groupedItems).length > 0 && (
        <div className="space-y-3">
          {Object.entries(groupedItems).map(([category, categoryItems]) => (
            <Card key={category}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-blue-600">
                  {category}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {categoryItems.map((item) => (
                  <div key={item.originalIndex} className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                    <GripVertical className="w-4 h-4 text-gray-400" />
                    <Input
                      value={item.text}
                      onChange={(e) => handleUpdateItem(item.originalIndex, 'text', e.target.value)}
                      className="flex-1 text-sm"
                    />
                    <Input
                      type="number"
                      value={item.points}
                      onChange={(e) => handleUpdateItem(item.originalIndex, 'points', parseFloat(e.target.value))}
                      className="w-20 text-sm"
                      min="0"
                      step="0.5"
                    />
                    <Button
                      onClick={() => handleRemoveItem(item.originalIndex)}
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}