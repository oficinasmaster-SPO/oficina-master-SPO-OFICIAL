import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, ArrowUpDown } from "lucide-react";
import ActionCard from "./ActionCard";

export default function ActionsList({ 
  actions, 
  sortBy, 
  onSortChange,
  onActionClick 
}) {
  const sortOptions = [
    { value: "prazo_prioridade", label: "🎯 Prioridade (Atrasadas → Próximas)" },
    { value: "created_newest", label: "🆕 Mais Recentes" },
    { value: "created_oldest", label: "📦 Mais Antigas" },
    { value: "updated_newest", label: "🔄 Atualizadas Recentemente" },
    { value: "updated_oldest", label: "⏸️ Sem Atualização Há Mais Tempo" },
    { value: "responsavel", label: "👤 Por Responsável" },
    { value: "status", label: "📊 Por Status" }
  ];

  const getSortedActions = () => {
    const sorted = [...actions];

    switch(sortBy) {
      case "prazo_prioridade":
        return sorted.sort((a, b) => {
          // Atrasadas primeiro
          if (a.prazoStatus === 'atrasado' && b.prazoStatus !== 'atrasado') return -1;
          if (a.prazoStatus !== 'atrasado' && b.prazoStatus === 'atrasado') return 1;
          
          // Depois paralisadas
          if (a.paralisado && !b.paralisado) return -1;
          if (!a.paralisado && b.paralisado) return 1;
          
          // Depois próximas
          if (a.prazoStatus === 'proximo' && b.prazoStatus !== 'proximo') return -1;
          if (a.prazoStatus !== 'proximo' && b.prazoStatus === 'proximo') return 1;
          
          // Por prazo
          if (a.due_date && b.due_date) {
            return new Date(a.due_date) - new Date(b.due_date);
          }
          
          return 0;
        });

      case "created_newest":
        return sorted.sort((a, b) => 
          new Date(b.created_date) - new Date(a.created_date)
        );

      case "created_oldest":
        return sorted.sort((a, b) => 
          new Date(a.created_date) - new Date(b.created_date)
        );

      case "updated_newest":
        return sorted.sort((a, b) => 
          new Date(b.updated_date) - new Date(a.updated_date)
        );

      case "updated_oldest":
        return sorted.sort((a, b) => 
          new Date(a.updated_date) - new Date(b.updated_date)
        );

      case "responsavel":
        return sorted.sort((a, b) => {
          const nameA = a.responsible?.full_name || "ZZZ";
          const nameB = b.responsible?.full_name || "ZZZ";
          return nameA.localeCompare(nameB);
        });

      case "status":
        const statusOrder = { 'atrasado': 0, 'em_andamento': 1, 'a_fazer': 2, 'concluido': 3 };
        return sorted.sort((a, b) => 
          (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99)
        );

      default:
        return sorted;
    }
  };

  const sortedActions = getSortedActions();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {sortedActions.length} Ação(ões) Encontrada(s)
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-gray-500" />
            <Select value={sortBy} onValueChange={onSortChange}>
              <SelectTrigger className="w-[280px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sortedActions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-lg font-medium mb-1">Nenhuma ação encontrada</p>
            <p className="text-sm">Ajuste os filtros ou limpe-os para ver mais ações</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedActions.map(action => (
              <ActionCard
                key={action.id}
                action={action}
                onClick={() => onActionClick(action)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}