import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputMoeda } from "@/components/ui/InputMoeda";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "../utils/formatters";
import { AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ConfigurarMetaFromDREModal({
  item,
  onClose,
  onSave
}) {
  const [formData, setFormData] = useState({
    responsavel_nome: "",
    meta_total_rs: 0,
    meta_fixa_rs: 0,
    meta_percentual: 0,
    notas: ""
  });

  const [metaType, setMetaType] = useState("fixa"); // "fixa" ou "percentual"
  const [errors, setErrors] = useState({});

  // Resetar form quando modal fecha
   useEffect(() => {
     return () => {
       setFormData({ responsavel_nome: "", meta_total_rs: 0, meta_fixa_rs: 0, meta_percentual: 0, notas: "" });
       setErrors({});
     };
   }, []);

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpar erro do campo
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (metaType === "fixa" && formData.meta_fixa_rs <= 0) {
      newErrors.meta_fixa_rs = "Informe um valor maior que zero";
    }

    if (metaType === "percentual" && (formData.meta_percentual <= 0 || formData.meta_percentual > 100)) {
      newErrors.meta_percentual = "Informe um percentual entre 1 e 100";
    }

    if (metaType === "percentual" && formData.meta_total_rs <= 0) {
      newErrors.meta_total_rs = "Informe a base de cálculo (faturamento) para usar percentual";
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
        responsavel_nome: formData.responsavel_nome,
        notas: formData.notas,
        // modo fixa: faturamento_meta_rs = próprio valor fixo (base neutra)
        // modo percentual: faturamento_meta_rs = base de cálculo informada
        faturamento_meta_rs: metaType === "percentual" ? formData.meta_total_rs : formData.meta_fixa_rs,
        meta_fixa_rs: metaType === "fixa" ? formData.meta_fixa_rs : 0,
        meta_percentual: metaType === "percentual" ? formData.meta_percentual : 0,
        categoria: item?.categoria,
        item: item?.item,
        tipo: item?.tipo
      });
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configurar Meta do Lançamento</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6">
          {/* Coluna 1: Dados Automáticos (readonly) */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <h3 className="text-xs font-semibold text-gray-700 uppercase">Dados do DRE</h3>

            <div>
              <Label className="text-xs text-gray-600">Categoria</Label>
              <p className="text-sm font-medium text-gray-900">{item?.categoria}</p>
            </div>

            <div>
              <Label className="text-xs text-gray-600">Item</Label>
              <p className="text-sm font-medium text-gray-900">{item?.item}</p>
            </div>

            <div>
              <Label className="text-xs text-gray-600">Valor Real (DRE)</Label>
              <p className="text-sm font-bold text-green-700">{formatCurrency(item?.valor_realizado)}</p>
            </div>
          </div>

          {/* Coluna 2: Configuração (editável) */}
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

            {/* Meta Total — só relevante no modo percentual */}
            {metaType === "percentual" && (
            <div>
              <Label htmlFor="metaTotal" className="text-xs font-medium mb-1.5 block">
                Base de cálculo — Faturamento (R$) *
              </Label>
              <InputMoeda
                id="metaTotal"
                placeholder="Ex: R$ 50.000,00"
                value={formData.meta_total_rs}
                onChange={(e) => handleFieldChange("meta_total_rs", parseFloat(e.target.value) || 0)}
                className={errors.meta_total_rs ? "border-red-500" : ""}
              />
              <p className="text-xs text-gray-500 mt-1">Faturamento total usado para calcular o %</p>
              {errors.meta_total_rs && (
                <p className="text-xs text-red-500 mt-1">{errors.meta_total_rs}</p>
              )}
            </div>
            )}

            {/* Tabs: Meta Fixa vs Percentual */}
            <Tabs value={metaType} onValueChange={setMetaType} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-3">
                <TabsTrigger value="fixa">Meta Fixa (R$)</TabsTrigger>
                <TabsTrigger value="percentual">Meta em %</TabsTrigger>
              </TabsList>

              <TabsContent value="fixa" className="space-y-2">
                <Label htmlFor="metaRs" className="text-xs font-medium">
                  OU Meta em R$ Fixo *
                </Label>
                <InputMoeda
                  id="metaRs"
                  placeholder="0"
                  value={formData.meta_fixa_rs}
                  onChange={(e) => handleFieldChange("meta_fixa_rs", parseFloat(e.target.value) || 0)}
                  className={errors.meta_fixa_rs ? "border-red-500" : ""}
                />
                {errors.meta_fixa_rs && (
                  <p className="text-xs text-red-500 mt-1">{errors.meta_fixa_rs}</p>
                )}
              </TabsContent>

              <TabsContent value="percentual" className="space-y-2">
                <Label htmlFor="metaPercent" className="text-xs font-medium">
                  OU Meta em % *
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
              </TabsContent>
            </Tabs>

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