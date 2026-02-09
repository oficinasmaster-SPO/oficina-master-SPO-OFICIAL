import React from 'react';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

export default function TemplateSelector({ templates = [], selectedTemplateId, onTemplateSelect, disabled }) {
  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  return (
    <div className="space-y-3">
      <div>
        <Label className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-500" />
          Iniciar com Template (Opcional)
        </Label>
        <Select 
          value={selectedTemplateId || "none"} 
          onValueChange={(value) => onTemplateSelect(value === "none" ? null : value)}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione um template ou comece do zero">
              {selectedTemplate ? selectedTemplate.name : "Nenhum template"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">✨ Começar do Zero</SelectItem>
            {templates.map(template => (
              <SelectItem key={template.id} value={template.id}>
                {template.name}
                {template.is_system && " 🔒"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedTemplate && (
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-purple-600 mt-0.5" />
              <div className="flex-1 text-sm">
                <p className="font-medium text-purple-900">{selectedTemplate.name}</p>
                {selectedTemplate.description && (
                  <p className="text-purple-700 text-xs mt-1">{selectedTemplate.description}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  {selectedTemplate.is_system && (
                    <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700 border-purple-300">
                      Template Sistema
                    </Badge>
                  )}
                  <span className="text-xs text-purple-600">
                    Usado {selectedTemplate.usage_count || 0}x
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}