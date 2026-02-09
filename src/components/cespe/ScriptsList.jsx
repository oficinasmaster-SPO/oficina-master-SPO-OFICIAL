import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Plus } from "lucide-react";

export default function ScriptsList({ scripts, onSelect, onCreateNew }) {
  if (!scripts || scripts.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 mb-4">Nenhum script salvo ainda.</p>
        <Button onClick={onCreateNew}>
          <Plus className="w-4 h-4 mr-2" />
          Criar Primeiro Script
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">Scripts Salvos</h3>
        <Button onClick={onCreateNew} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Novo Script
        </Button>
      </div>

      {scripts.map((script) => (
        <Card key={script.id} className="hover:shadow-md transition-shadow">
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-medium">
                    {script.position || "Script Geral"}
                  </h4>
                  {script.is_active && (
                    <Badge className="bg-green-100 text-green-800">Ativo</Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {script.company_history?.substring(0, 150)}...
                </p>
              </div>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onSelect(script)}
              >
                <Eye className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}