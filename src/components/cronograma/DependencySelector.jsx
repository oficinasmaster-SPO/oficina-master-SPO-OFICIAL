import React from "react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { X } from "lucide-react";

export default function DependencySelector({ 
  selectedDependencies = [], 
  availableItems = [], 
  currentItemId,
  onChange 
}) {
  const handleToggleDependency = (itemId) => {
    if (selectedDependencies.includes(itemId)) {
      onChange(selectedDependencies.filter(id => id !== itemId));
    } else {
      onChange([...selectedDependencies, itemId]);
    }
  };

  const filteredItems = availableItems.filter(item => 
    item.id !== currentItemId && !item.not_started
  );

  return (
    <div className="space-y-3">
      <Label>Dependências (tarefas que devem ser concluídas antes)</Label>
      
      {selectedDependencies.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg">
          {selectedDependencies.map(depId => {
            const depItem = availableItems.find(i => i.id === depId);
            if (!depItem) return null;
            
            return (
              <Badge 
                key={depId} 
                variant="secondary" 
                className="flex items-center gap-1 pr-1"
              >
                {depItem.item_nome}
                <button
                  onClick={() => handleToggleDependency(depId)}
                  className="ml-1 hover:bg-gray-300 rounded p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}

      <div className="border rounded-lg max-h-48 overflow-y-auto">
        {filteredItems.length === 0 ? (
          <p className="text-sm text-gray-500 p-3 text-center">
            Nenhuma tarefa disponível para dependência
          </p>
        ) : (
          <div className="divide-y">
            {filteredItems.map(item => (
              <div 
                key={item.id} 
                className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                onClick={() => handleToggleDependency(item.id)}
              >
                <Checkbox
                  checked={selectedDependencies.includes(item.id)}
                  onCheckedChange={() => handleToggleDependency(item.id)}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.item_nome}</p>
                  <p className="text-xs text-gray-500 capitalize">{item.item_tipo}</p>
                </div>
                <Badge 
                  className={
                    item.status === 'concluido' 
                      ? 'bg-green-100 text-green-700' 
                      : item.status === 'em_andamento'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700'
                  }
                >
                  {item.status === 'concluido' ? 'Concluído' : 
                   item.status === 'em_andamento' ? 'Em andamento' : 'A fazer'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}