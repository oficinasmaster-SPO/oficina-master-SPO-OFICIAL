import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileCheck, Sparkles, Clock } from "lucide-react";
import AIFieldAssist from "./AIFieldAssist";

export default function ITEvidenciaTab({ evidencia, onChange, itData, mapData }) {
  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <FileCheck className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900">Evidência Obrigatória de Execução</h4>
            <p className="text-sm text-blue-700 mt-1">
              Define o tipo de registro que comprova a execução desta IT e quanto tempo deve ser mantido.
            </p>
          </div>
        </div>
      </div>

      <div>
        <Label>Tipo de Evidência *</Label>
        <p className="text-xs text-gray-500 mb-2">Ex: OS preenchida, Checklist assinado, Foto, Relatório</p>
        <div className="relative">
          <Input
            value={evidencia.tipo_evidencia || ""}
            onChange={(e) => onChange({ ...evidencia, tipo_evidencia: e.target.value })}
            placeholder="Qual tipo de registro comprova a execução?"
          />
          <AIFieldAssist
            fieldName="Tipo de Evidência"
            fieldValue={evidencia.tipo_evidencia}
            itData={itData}
            mapData={mapData}
            onApply={(suggestion) => onChange({ ...evidencia, tipo_evidencia: suggestion })}
            suggestions={[
              { type: 'evidencia_tipo', label: 'Sugerir Tipo de Evidência', icon: Sparkles },
              { type: 'evidencia_auditavel', label: 'Evidência Auditável', icon: FileCheck }
            ]}
          />
        </div>
      </div>

      <div>
        <Label>Descrição da Evidência *</Label>
        <p className="text-xs text-gray-500 mb-2">O que deve ser registrado e como</p>
        <div className="relative">
          <Textarea
            value={evidencia.descricao || ""}
            onChange={(e) => onChange({ ...evidencia, descricao: e.target.value })}
            placeholder="Descreva detalhadamente o que deve ser registrado para comprovar a execução..."
            rows={4}
          />
          <AIFieldAssist
            fieldName="Descrição da Evidência"
            fieldValue={evidencia.descricao}
            itData={itData}
            mapData={mapData}
            onApply={(suggestion) => onChange({ ...evidencia, descricao: suggestion })}
            suggestions={[
              { type: 'evidencia_descricao', label: 'Gerar Descrição Completa', icon: Sparkles },
              { type: 'evidencia_detalhada', label: 'Detalhes Operacionais', icon: FileCheck }
            ]}
          />
        </div>
      </div>

      <div>
        <Label>Controle de Registro / Retenção *</Label>
        <p className="text-xs text-gray-500 mb-2">Por quanto tempo esta evidência deve ser mantida?</p>
        <div className="relative">
          <Select 
            value={evidencia.periodo_retencao || ""} 
            onValueChange={(v) => onChange({ ...evidencia, periodo_retencao: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1_ano">1 ano</SelectItem>
              <SelectItem value="2_anos">2 anos</SelectItem>
              <SelectItem value="3_anos">3 anos</SelectItem>
              <SelectItem value="5_anos">5 anos</SelectItem>
              <SelectItem value="10_anos">10 anos</SelectItem>
              <SelectItem value="permanente">Permanente</SelectItem>
              <SelectItem value="conforme_lei">Conforme legislação</SelectItem>
            </SelectContent>
          </Select>
          <AIFieldAssist
            fieldName="Período de Retenção"
            fieldValue={evidencia.periodo_retencao}
            itData={itData}
            mapData={mapData}
            onApply={(suggestion) => {
              // Tentar encontrar um valor válido na sugestão
              const mapping = {
                '1': '1_ano',
                '2': '2_anos', 
                '3': '3_anos',
                '5': '5_anos',
                '10': '10_anos',
                'permanente': 'permanente',
                'legislação': 'conforme_lei',
                'lei': 'conforme_lei'
              };
              
              let matched = null;
              for (const [key, value] of Object.entries(mapping)) {
                if (suggestion.toLowerCase().includes(key)) {
                  matched = value;
                  break;
                }
              }
              
              if (matched) {
                onChange({ ...evidencia, periodo_retencao: matched });
              } else {
                alert("Sugestão: " + suggestion + "\nSelecione manualmente o período mais adequado.");
              }
            }}
            suggestions={[
              { type: 'retencao_sugerir', label: 'Sugerir Período Adequado', icon: Clock },
              { type: 'retencao_legal', label: 'Baseado em Requisitos Legais', icon: FileCheck }
            ]}
          />
        </div>
      </div>

      {evidencia.periodo_retencao && (
        <div className="bg-gray-50 border rounded-lg p-3">
          <h5 className="text-sm font-semibold text-gray-700 mb-2">Justificativa da Retenção</h5>
          <div className="relative">
            <Textarea
              value={evidencia.justificativa_retencao || ""}
              onChange={(e) => onChange({ ...evidencia, justificativa_retencao: e.target.value })}
              placeholder="Por que este período foi escolhido? (requisitos legais, normas, boas práticas...)"
              rows={2}
              className="text-sm"
            />
            <AIFieldAssist
              fieldName="Justificativa"
              fieldValue={evidencia.justificativa_retencao}
              itData={itData}
              mapData={mapData}
              onApply={(suggestion) => onChange({ ...evidencia, justificativa_retencao: suggestion })}
              suggestions={[
                { type: 'justificativa_retencao', label: 'Gerar Justificativa', icon: Sparkles }
              ]}
            />
          </div>
        </div>
      )}
    </div>
  );
}