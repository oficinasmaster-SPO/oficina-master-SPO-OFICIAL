import React from "react";
import { Button } from "@/components/ui/button";
import { LayoutGrid, Table, GitBranch } from "lucide-react";

export default function ViewToggle({ currentView, onViewChange }) {
  const views = [
    { value: "cards", label: "Cards", icon: LayoutGrid },
    { value: "table", label: "Tabela", icon: Table },
    { value: "timeline", label: "Timeline", icon: GitBranch }
  ];

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600 mr-2">Visualização:</span>
      {views.map(view => {
        const Icon = view.icon;
        return (
          <Button
            key={view.value}
            variant={currentView === view.value ? "default" : "outline"}
            size="sm"
            onClick={() => onViewChange(view.value)}
            className="flex items-center gap-2"
          >
            <Icon className="w-4 h-4" />
            {view.label}
          </Button>
        );
      })}
    </div>
  );
}