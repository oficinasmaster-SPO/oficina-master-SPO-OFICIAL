import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INTELLIGENCE_AREAS, INTELLIGENCE_TYPES, GRAVITY_LEVELS } from "@/components/lib/clientIntelligenceConstants";
import { X } from "lucide-react";

export default function ClientIntelligenceForm({
  type,
  item = null,
  onSubmit,
  onCancel,
  isLoading = false,
}) {
  const [formData, setFormData] = useState(
    item || {
      type,
      area: "",
      subcategory: "",
      title: "",
      description: "",
      gravity: "media",
      is_recurring: false,
      action_defined: false,
      action_description: "",
      tags: [],
      status: "ativo",
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const areas = Object.entries(INTELLIGENCE_AREAS).map(([key, val]) => ({
    id: key,
    label: val.label,
  }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Área
          </label>
          <Select value={formData.area} onValueChange={(value) => setFormData({ ...formData, area: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma área" />
            </SelectTrigger>
            <SelectContent>
              {areas.map((area) => (
                <SelectItem key={area.id} value={area.id}>
                  {area.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Gravidade
          </label>
          <Select value={formData.gravity} onValueChange={(value) => setFormData({ ...formData, gravity: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(GRAVITY_LEVELS).map(([key, val]) => (
                <SelectItem key={key} value={key}>
                  {val.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Título
        </label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Título do item"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Descrição
        </label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Descrição detalhada"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.is_recurring}
            onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
            className="rounded"
          />
          <span className="text-sm text-gray-700">É recorrente?</span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.action_defined}
            onChange={(e) => setFormData({ ...formData, action_defined: e.target.checked })}
            className="rounded"
          />
          <span className="text-sm text-gray-700">Ação definida?</span>
        </label>
      </div>

      {formData.action_defined && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descrição da Ação
          </label>
          <Textarea
            value={formData.action_description || ""}
            onChange={(e) => setFormData({ ...formData, action_description: e.target.value })}
            placeholder="Descreva a ação planejada"
            rows={2}
          />
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {item ? "Atualizar" : "Criar"}
        </Button>
      </div>
    </form>
  );
}