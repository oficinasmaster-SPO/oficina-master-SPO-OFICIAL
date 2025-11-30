import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

export default function MetricForm({ metric, onSave, onCancel, isSaving }) {
    const [formData, setFormData] = React.useState(metric || {
        code: "",
        name: "",
        category: "vendas",
        data_type: "number",
        description: "",
        requires_evidence: false,
        is_active: true
    });

    const categories = [
        { value: "vendas", label: "Vendas" },
        { value: "comercial", label: "Comercial" },
        { value: "tecnico", label: "Técnico" },
        { value: "estoque", label: "Estoque" },
        { value: "financeiro", label: "Financeiro" },
        { value: "rh", label: "RH" },
        { value: "zeladoria", label: "Zeladoria" },
        { value: "lava_jato", label: "Lava Jato" },
        { value: "gestao", label: "Gestão" }
    ];

    const types = [
        { value: "number", label: "Número (Qtd)" },
        { value: "currency", label: "Moeda (R$)" },
        { value: "text", label: "Texto" },
        { value: "boolean", label: "Sim/Não" },
        { value: "percentage", label: "Percentual (%)" }
    ];

    return (
        <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Código (ex: v01)</Label>
                    <Input 
                        value={formData.code} 
                        onChange={(e) => setFormData({...formData, code: e.target.value})}
                        placeholder="v01"
                    />
                </div>
                <div>
                    <Label>Categoria</Label>
                    <Select 
                        value={formData.category} 
                        onValueChange={(v) => setFormData({...formData, category: v})}
                    >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {categories.map(c => (
                                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div>
                <Label>Nome da Métrica</Label>
                <Input 
                    value={formData.name} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Ex: N.º Orçamentos Fechados"
                />
            </div>

            <div>
                <Label>Tipo de Dado</Label>
                <Select 
                    value={formData.data_type} 
                    onValueChange={(v) => setFormData({...formData, data_type: v})}
                >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {types.map(t => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div>
                <Label>Descrição / Instruções</Label>
                <Textarea 
                    value={formData.description} 
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Explique como preencher este campo..."
                />
            </div>

            <div className="flex items-center space-x-2">
                <Checkbox 
                    id="evidence" 
                    checked={formData.requires_evidence}
                    onCheckedChange={(c) => setFormData({...formData, requires_evidence: c})}
                />
                <Label htmlFor="evidence">Exige Evidência (Foto/Print/Arquivo)</Label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={onCancel}>Cancelar</Button>
                <Button onClick={() => onSave(formData)} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Métrica
                </Button>
            </div>
        </div>
    );
}