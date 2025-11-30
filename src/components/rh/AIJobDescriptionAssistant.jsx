import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AIJobDescriptionAssistant({ onGenerated }) {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingData, setPendingData] = useState(null);
  
  const [formData, setFormData] = useState({
    job_title: "",
    department: "",
    key_responsibilities: "",
    qualifications: "",
    experience_level: ""
  });

  const handleGenerate = async () => {
    if (!formData.job_title || !formData.department) {
      toast.error("Preencha pelo menos o cargo e departamento");
      return;
    }
    setLoading(true);

    try {
      const prompt = `
Você é um especialista em RH da metodologia Oficinas Master. Gere uma descrição de cargo COMPLETA e PROFISSIONAL baseada no formulário Oficinas Master.

CARGO: ${formData.job_title}
DEPARTAMENTO: ${formData.department}
RESPONSABILIDADES PRINCIPAIS: ${formData.key_responsibilities || "Não informado"}
QUALIFICAÇÕES: ${formData.qualifications || "Não informado"}
NÍVEL DE EXPERIÊNCIA: ${formData.experience_level || "Não informado"}

Retorne um JSON estruturado com os seguintes campos:

{
  "job_title": "string",
  "previous_experience": [{"item": "string", "required": boolean, "desired": boolean}],
  "education": [{"item": "string", "required": boolean, "desired": boolean}],
  "knowledge": [{"item": "string", "required": boolean, "desired": boolean}],
  "clients": [{"item": "string", "internal": boolean, "external": boolean}],
  "main_activities": ["string"],
  "main_responsibilities": "string (texto longo)",
  "co_responsibilities": "string (texto longo)",
  "personal_attributes": [{"item": "string", "required": boolean, "desired": boolean}],
  "inherent_risks": "string",
  "equipment_tools": ["string"],
  "managed_information": "string",
  "working_conditions": "string",
  "physical_effort": "string",
  "mental_effort": "string",
  "visual_effort": "string",
  "financial_transactions": "string",
  "third_party_safety": "string",
  "contact_responsibilities": "string",
  "indicators": [{"item": "string", "required": boolean, "desired": boolean}],
  "trainings": ["string"]
}

Seja detalhado e profissional. Use linguagem do setor automotivo.
`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            job_title: { type: "string" },
            previous_experience: { type: "array" },
            education: { type: "array" },
            knowledge: { type: "array" },
            clients: { type: "array" },
            main_activities: { type: "array" },
            main_responsibilities: { type: "string" },
            co_responsibilities: { type: "string" },
            personal_attributes: { type: "array" },
            inherent_risks: { type: "string" },
            equipment_tools: { type: "array" },
            managed_information: { type: "string" },
            working_conditions: { type: "string" },
            physical_effort: { type: "string" },
            mental_effort: { type: "string" },
            visual_effort: { type: "string" },
            financial_transactions: { type: "string" },
            third_party_safety: { type: "string" },
            contact_responsibilities: { type: "string" },
            indicators: { type: "array" },
            trainings: { type: "array" }
          }
        }
      });

      setPendingData({ ...response, generated_by_ai: true });
      setShowConfirm(true);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar descrição");
    } finally {
      setLoading(false);
    }
  };

  const confirmApply = () => {
      if (pendingData) {
          onGenerated(pendingData);
          toast.success("Descrição gerada aplicada com sucesso!");
          setShowConfirm(false);
          setPendingData(null);
      }
  };

  return (
    <>
        <Card className="shadow-lg border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white">
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            Assistente IA - Geração de Descrição de Cargo
            </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <div>
            <Label>Cargo *</Label>
            <Input
                placeholder="Ex: Mecânico Líder"
                value={formData.job_title}
                onChange={(e) => setFormData({...formData, job_title: e.target.value})}
            />
            </div>

            <div>
            <Label>Departamento *</Label>
            <Input
                placeholder="Ex: Técnico / Vendas / Administrativo"
                value={formData.department}
                onChange={(e) => setFormData({...formData, department: e.target.value})}
            />
            </div>

            <div>
            <Label>Responsabilidades Principais</Label>
            <Textarea
                placeholder="Ex: Diagnosticar falhas, executar reparos, supervisionar equipe..."
                value={formData.key_responsibilities}
                onChange={(e) => setFormData({...formData, key_responsibilities: e.target.value})}
                rows={3}
            />
            </div>

            <div>
            <Label>Qualificações Desejadas</Label>
            <Textarea
                placeholder="Ex: Ensino médio completo, curso técnico, experiência com diagnóstico..."
                value={formData.qualifications}
                onChange={(e) => setFormData({...formData, qualifications: e.target.value})}
                rows={3}
            />
            </div>

            <div>
            <Label>Nível de Experiência</Label>
            <Input
                placeholder="Ex: Júnior / Pleno / Sênior"
                value={formData.experience_level}
                onChange={(e) => setFormData({...formData, experience_level: e.target.value})}
            />
            </div>

            <Button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700"
            >
            {loading ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Gerando com IA...</>
            ) : (
                <><Sparkles className="w-5 h-5 mr-2" /> Gerar Descrição Completa</>
            )}
            </Button>
        </CardContent>
        </Card>

        <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Substituir conteúdo atual?</AlertDialogTitle>
                    <AlertDialogDescription>
                        A IA gerou uma nova descrição completa. Isso irá substituir os campos do formulário atual. Deseja aplicar as alterações?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmApply} className="bg-purple-600 hover:bg-purple-700">
                        Sim, aplicar sugestão da IA
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}