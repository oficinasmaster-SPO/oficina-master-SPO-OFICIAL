import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Save, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

export default function PlanModulesManager({ planData, onSave }) {
  const [expanded, setExpanded] = useState(false);
  const [localModules, setLocalModules] = useState(planData?.modules_allowed || []);
  const [localFeatures, setLocalFeatures] = useState(planData?.features_allowed || []);
  const [newModule, setNewModule] = useState("");
  const [newFeature, setNewFeature] = useState("");

  const handleAddModule = () => {
    if (!newModule.trim()) return;
    if (localModules.includes(newModule)) {
      toast.error("Módulo já existe");
      return;
    }
    setLocalModules([...localModules, newModule]);
    setNewModule("");
  };

  const handleRemoveModule = (module) => {
    setLocalModules(localModules.filter(m => m !== module));
  };

  const handleAddFeature = () => {
    if (!newFeature.trim()) return;
    if (localFeatures.includes(newFeature)) {
      toast.error("Funcionalidade já existe");
      return;
    }
    setLocalFeatures([...localFeatures, newFeature]);
    setNewFeature("");
  };

  const handleRemoveFeature = (feature) => {
    setLocalFeatures(localFeatures.filter(f => f !== feature));
  };

  const handleSave = async () => {
    try {
      await onSave({
        modules_allowed: localModules,
        features_allowed: localFeatures
      });
      toast.success("Configurações salvas!");
    } catch (error) {
      toast.error("Erro ao salvar");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Módulos e Funcionalidades</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>
      
      {expanded && (
        <CardContent className="space-y-6">
          {/* Módulos */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Módulos Permitidos</Label>
            <div className="flex gap-2 mb-3">
              <Input
                placeholder="Nome do módulo"
                value={newModule}
                onChange={(e) => setNewModule(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddModule()}
              />
              <Button onClick={handleAddModule} size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {localModules.map((module) => (
                <Badge key={module} variant="outline" className="flex items-center gap-2 px-3 py-1">
                  {module}
                  <button
                    onClick={() => handleRemoveModule(module)}
                    className="hover:text-red-600"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
              {localModules.length === 0 && (
                <p className="text-sm text-gray-500">Nenhum módulo adicionado</p>
              )}
            </div>
          </div>

          {/* Funcionalidades */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Funcionalidades Permitidas</Label>
            <div className="flex gap-2 mb-3">
              <Input
                placeholder="Nome da funcionalidade"
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddFeature()}
              />
              <Button onClick={handleAddFeature} size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {localFeatures.map((feature) => (
                <Badge key={feature} variant="outline" className="flex items-center gap-2 px-3 py-1">
                  {feature}
                  <button
                    onClick={() => handleRemoveFeature(feature)}
                    className="hover:text-red-600"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
              {localFeatures.length === 0 && (
                <p className="text-sm text-gray-500">Nenhuma funcionalidade adicionada</p>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" />
              Salvar Alterações
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}