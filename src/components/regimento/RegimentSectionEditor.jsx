import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function RegimentSectionEditor({ title, description, sectionKey, formData, setFormData }) {
  const sectionData = formData[sectionKey] || {};

  const updateSection = (field, value) => {
    setFormData({
      ...formData,
      [sectionKey]: {
        ...sectionData,
        [field]: value
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Conteúdo / Descrição</Label>
          <Textarea
            rows={6}
            value={typeof sectionData === 'string' ? sectionData : JSON.stringify(sectionData, null, 2)}
            onChange={(e) => {
              setFormData({
                ...formData,
                [sectionKey]: e.target.value
              });
            }}
            placeholder={`Descreva as normas e políticas de ${title.toLowerCase()}...`}
            className="font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            💡 Dica: Seja claro e objetivo. Use tópicos quando necessário.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}