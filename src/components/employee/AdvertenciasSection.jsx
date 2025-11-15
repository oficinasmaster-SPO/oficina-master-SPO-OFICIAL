import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function AdvertenciasSection({ employee, onUpdate }) {
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    reason: "",
    severity: "leve",
    description: ""
  });

  const handleAdd = async () => {
    if (!formData.reason.trim() || !formData.description.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }

    const user = await base44.auth.me();
    
    const newWarning = {
      date: new Date().toISOString(),
      reason: formData.reason,
      severity: formData.severity,
      description: formData.description,
      created_by: user.email
    };

    const updatedWarnings = [...(employee.warnings || []), newWarning];
    
    await onUpdate({ warnings: updatedWarnings });
    setShowDialog(false);
    setFormData({ reason: "", severity: "leve", description: "" });
  };

  const severityColors = {
    leve: "border-yellow-200 bg-yellow-50 text-yellow-800",
    grave: "border-orange-200 bg-orange-50 text-orange-800",
    gravissima: "border-red-200 bg-red-50 text-red-800"
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Advertências
          </CardTitle>
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Registrar Advertência
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!employee.warnings || employee.warnings.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Nenhuma advertência registrada</p>
        ) : (
          <div className="space-y-3">
            {employee.warnings.map((warning, index) => (
              <div key={index} className={`p-4 rounded-lg border-2 ${severityColors[warning.severity]}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold">{warning.reason}</p>
                    <span className="text-xs uppercase font-bold">{warning.severity}</span>
                  </div>
                  <span className="text-sm">
                    {new Date(warning.date).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <p className="text-sm mt-2">{warning.description}</p>
                <p className="text-xs text-gray-600 mt-2">Por: {warning.created_by}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Advertência</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Motivo</Label>
              <Input
                value={formData.reason}
                onChange={(e) => setFormData({...formData, reason: e.target.value})}
                placeholder="Ex: Atraso recorrente"
              />
            </div>
            <div>
              <Label>Gravidade</Label>
              <Select value={formData.severity} onValueChange={(value) => setFormData({...formData, severity: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="leve">Leve</SelectItem>
                  <SelectItem value="grave">Grave</SelectItem>
                  <SelectItem value="gravissima">Gravíssima</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descrição Detalhada</Label>
              <Textarea
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Descreva os detalhes da advertência..."
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
              <Button onClick={handleAdd} className="bg-orange-600 hover:bg-orange-700">Registrar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}