import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, AlertTriangle, Printer, Filter } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { jsPDF } from "npm:jspdf@2.5.1";

export default function AdvertenciasSection({ employee, onUpdate }) {
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    reason: "",
    severity: "leve",
    description: ""
  });
  
  const [filters, setFilters] = useState({
    severity: "all",
    month: "all"
  });

  const handleAdd = async () => {
    if (!formData.reason.trim() || !formData.description.trim()) {
      toast.error("Preencha o motivo e a descrição");
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

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Registro de Advertências - ${employee.full_name}`, 20, 20);
    doc.setFontSize(12);
    
    let y = 40;
    filteredWarnings.forEach((w) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFont(undefined, 'bold');
      doc.text(`${new Date(w.date).toLocaleDateString('pt-BR')} - ${severityLabels[w.severity]} - ${w.reason}`, 20, y);
      y += 7;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      const splitText = doc.splitTextToSize(w.description, 170);
      doc.text(splitText, 20, y);
      y += splitText.length * 5 + 10;
    });
    
    doc.save(`advertencias_${employee.full_name}.pdf`);
  };

  const severityColors = {
    leve: "border-yellow-200 bg-yellow-50",
    grave: "border-orange-200 bg-orange-50",
    gravissima: "border-red-200 bg-red-50"
  };

  const severityLabels = {
    leve: "Leve",
    grave: "Grave",
    gravissima: "Gravíssima"
  };

  const filteredWarnings = (employee.warnings || []).filter(w => {
    const date = new Date(w.date);
    const monthMatch = filters.month === "all" || (date.getMonth() + 1) === parseInt(filters.month);
    const severityMatch = filters.severity === "all" || w.severity === filters.severity;
    return monthMatch && severityMatch;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <Card className="shadow-lg border-2 border-orange-200">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Advertências
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportToPDF}>
              <Printer className="w-4 h-4 mr-2" />
              PDF
            </Button>
            <Button onClick={() => setShowDialog(true)} className="bg-orange-600 hover:bg-orange-700" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Registrar
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 mt-4">
          <div className="w-32">
            <Select value={filters.month} onValueChange={(v) => setFilters({...filters, month: v})}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Meses</SelectItem>
                {Array.from({length: 12}, (_, i) => (
                  <SelectItem key={i+1} value={(i+1).toString()}>{new Date(0, i).toLocaleString('pt-BR', {month: 'long'})}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-32">
            <Select value={filters.severity} onValueChange={(v) => setFilters({...filters, severity: v})}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Gravidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="leve">Leve</SelectItem>
                <SelectItem value="grave">Grave</SelectItem>
                <SelectItem value="gravissima">Gravíssima</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredWarnings.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Nenhuma advertência encontrada</p>
        ) : (
          <div className="space-y-3">
            {filteredWarnings.map((warning, index) => (
              <div key={index} className={`p-4 rounded-lg border-2 ${severityColors[warning.severity]}`}>
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 mt-1 flex-shrink-0 text-orange-600" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-bold text-sm">{warning.reason}</span>
                        <span className={`ml-2 px-2 py-1 rounded text-xs font-semibold ${
                          warning.severity === 'leve' ? 'bg-yellow-200 text-yellow-800' :
                          warning.severity === 'grave' ? 'bg-orange-200 text-orange-800' :
                          'bg-red-200 text-red-800'
                        }`}>
                          {severityLabels[warning.severity]}
                        </span>
                      </div>
                      <span className="text-sm text-gray-600">
                        {new Date(warning.date).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{warning.description}</p>
                    <p className="text-xs text-gray-500 mt-2">Registrado por: {warning.created_by}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {employee.warnings && employee.warnings.length > 0 && (
          <div className="mt-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
            <p className="text-sm font-semibold text-orange-900">
              Total de Advertências: {employee.warnings.length}
            </p>
            <div className="flex gap-4 mt-2 text-xs">
              <span>Leves: {employee.warnings.filter(w => w.severity === 'leve').length}</span>
              <span>Graves: {employee.warnings.filter(w => w.severity === 'grave').length}</span>
              <span>Gravíssimas: {employee.warnings.filter(w => w.severity === 'gravissima').length}</span>
            </div>
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
              <Label>Motivo *</Label>
              <Input
                placeholder="Ex: Atraso, Comportamento inadequado..."
                value={formData.reason}
                onChange={(e) => setFormData({...formData, reason: e.target.value})}
              />
            </div>
            <div>
              <Label>Gravidade *</Label>
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
              <Label>Descrição *</Label>
              <Textarea
                rows={6}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Descreva em detalhes o ocorrido e as medidas tomadas..."
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
              <Button onClick={handleAdd} className="bg-orange-600 hover:bg-orange-700">
                Registrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}