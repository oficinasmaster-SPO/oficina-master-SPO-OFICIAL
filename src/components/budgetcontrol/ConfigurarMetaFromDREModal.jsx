import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "../utils/formatters";
import { AlertCircle } from "lucide-react";

export default function ConfigurarMetaFromDREModal({
  isOpen,
  selectedItem,
  onClose,
  onSave,
  workshopId,
  mes,
  faturamentoMeta,
  colaboradores = []
}) {
  const [formData, setFormData] = useState({
    responsavel_nome: "",
    meta_fixa_rs: 0,
    meta_percentual: 0,
    notas: ""
  });

  const [errors, setErrors] = useState({});

  // Resetar form quando modal fecha
  useEffect(() => {
    if (!isOpen) {
      setFormData({ responsavel_nome: "", meta_fixa_rs: 0, meta_percentual: 0, notas: "" });
      setErrors({});
    }
  }, [isOpen]);

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpar erro do campo
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.responsavel_nome.trim()) {
      newErrors.responsavel_nome = "Responsável é obrigatório";
    }

    if (formData.meta_fixa_rs < 0) {
      newErrors.meta_fixa_rs = "Meta em R$ não pode ser negativa";
    }

    if (formData.meta_percentual < 0 || formData.meta_percentual > 100) {
      newErrors.meta_percentual = "Meta em % deve ser entre 0 e 100";
    }

    if (formData.meta_fixa_rs === 0 && formData.meta_percentual === 0) {
      newErrors.meta_percentual = "Defina pelo menos uma meta (R$ ou %)";
    }

    if (formData.notas.length > 300) {
      newErrors.notas = "Observação não pode exceder 300 caracteres";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      onSave({
        ...formData,
        categoria: selectedItem?.categoria,
        item: selectedItem?.item,
        valor_realizado: selectedItem?.valor_realizado,
        tipo: selectedItem?.tipo,
        entra_tcmp2: selectedItem?.entra_tcmp2,
        workshop_id: workshopId,
        mes: mes,
        faturamento_meta_rs: faturamentoMeta
      });
    }
  };

  if (!isOpen || !selectedItem) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configurar Meta do Lançamento</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Seção 1: Dados Automáticos (readonly) */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <h3 className="text-xs font-semibold text-gray-700 uppercase">Dados do DRE</h3>

            <div>
              <Label className="text-xs text-gray-600">Categoria</Label>
              <p className="text-sm font-medium text-gray-900">{selectedItem.categoria}</p>
            </div>

            <div>
              <Label className="text-xs text-gray-600">Item</Label>
              <p className="text-sm font-medium text-gray-900">{selectedItem.item}</p>
            </div>

            <div>
              <Label className="text-xs text-gray-600">Valor Real (DRE)</Label>
              <p className="text-sm font-bold text-green-700">{formatCurrency(selectedItem.valor_realizado)}</p>
            </div>
          </div>

          {/* Seção 2: Configuração (editável) */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-gray-700 uppercase">Configurar Meta</h3>

            {/* Responsável */}
            <div>
              <Label htmlFor="responsavel" className="text-xs font-medium mb-1.5 block">
                Responsável *
              </Label>
              <Input
                id="responsavel"
                placeholder="Nome do responsável"
                value={formData.responsavel_nome}
                onChange={(e) => handleFieldChange("responsavel_nome", e.target.value)}
                className={errors.responsavel_nome ? "border-red-500" : ""}
              />
              {errors.responsavel_nome && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.responsavel_nome}
                </p>
              )}
            </div>

            {/* Meta em R$ */}
            <div>
              <Label htmlFor="metaRs" className="text-xs font-medium mb-1.5 block">
                Meta em R$
              </Label>
              <Input
                id="metaRs"
                type="number"
                placeholder="0"
                value={formData.meta_fixa_rs}
                onChange={(e) => handleFieldChange("meta_fixa_rs", parseFloat(e.target.value) || 0)}
                min="0"
                className={errors.meta_fixa_rs ? "border-red-500" : ""}
              />
              {errors.meta_fixa_rs && (
                <p className="text-xs text-red-500 mt-1">{errors.meta_fixa_rs}</p>
              )}
            </div>

            {/* Meta em % */}
            <div>
              <Label htmlFor="metaPercent" className="text-xs font-medium mb-1.5 block">
                Meta em %
              </Label>
              <Input
                id="metaPercent"
                type="number"
                placeholder="0"
                value={formData.meta_percentual}
                onChange={(e) => handleFieldChange("meta_percentual", parseFloat(e.target.value) || 0)}
                min="0"
                max="100"
                className={errors.meta_percentual ? "border-red-500" : ""}
              />
              {errors.meta_percentual && (
                <p className="text-xs text-red-500 mt-1">{errors.meta_percentual}</p>
              )}
            </div>

            {/* Observações */}
            <div>
              <Label htmlFor="notas" className="text-xs font-medium mb-1.5 block">
                Observações ({formData.notas.length}/300)
              </Label>
              <Textarea
                id="notas"
                placeholder="Adicione observações..."
                value={formData.notas}
                onChange={(e) => handleFieldChange("notas", e.target.value)}
                className={`min-h-24 ${errors.notas ? "border-red-500" : ""}`}
              />
              {errors.notas && (
                <p className="text-xs text-red-500 mt-1">{errors.notas}</p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
            Salvar Meta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}