import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ContractPreview({ contract, workshop }) {
  if (!contract || !workshop) return null;

  const replaceVariables = (text) => {
    if (!text) return "";
    
    return text
      .replace(/\[RAZÃO SOCIAL DA EMPRESA\]/g, workshop.razao_social || workshop.name)
      .replace(/\[CNPJ\]/g, workshop.cnpj || "___________________")
      .replace(/\[ENDEREÇO COMPLETO – rua, número, bairro, cidade\/UF e CEP\]/g, 
        workshop.endereco_completo || `${workshop.city || "___"}/${workshop.state || "___"}, CEP: ___`)
      .replace(/\[NOME DO REPRESENTANTE LEGAL\]/g, workshop.owner_name || "___________________")
      .replace(/\[CPF\]/g, "___________________")
      .replace(/\[E-MAIL\]/g, "___________________")
      .replace(/\[TELEFONE\]/g, "___________________")
      .replace(/{{workshop_name}}/g, workshop.name)
      .replace(/{{cnpj}}/g, workshop.cnpj || "___________________")
      .replace(/{{plan_type}}/g, contract.plan_type)
      .replace(/{{contract_value}}/g, `R$ ${contract.contract_value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
      .replace(/{{monthly_value}}/g, `R$ ${contract.monthly_value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
      .replace(/{{duration}}/g, contract.contract_duration_months || 12);
  };

  return (
    <Card className="max-h-[600px] overflow-y-auto">
      <CardHeader>
        <CardTitle>Pré-visualização do Contrato</CardTitle>
        <p className="text-sm text-gray-600">
          Confira os dados antes de enviar para o cliente
        </p>
      </CardHeader>
      <CardContent>
        <div 
          className="prose prose-sm max-w-none"
          style={{ whiteSpace: 'pre-wrap' }}
        >
          {replaceVariables(contract.contract_template)}
        </div>
        
        <div className="mt-8 pt-6 border-t">
          <p className="text-sm text-gray-600 mb-4">
            <strong>Local e Data:</strong> Maringá/PR, {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
          
          <div className="grid md:grid-cols-2 gap-8 mt-6">
            <div>
              <p className="text-sm font-semibold mb-2">CONTRATADA:</p>
              <p className="text-sm">OFICINAS MASTER EDUCAÇÃO EMPRESARIAL</p>
              <p className="text-sm text-gray-600">CNPJ: 37.815.934/0001-91</p>
              <div className="mt-4 border-t pt-2">
                <p className="text-xs text-gray-500">Fernanda Rodrigues Silva</p>
              </div>
            </div>
            
            <div>
              <p className="text-sm font-semibold mb-2">CONTRATANTE:</p>
              <p className="text-sm">{workshop.razao_social || workshop.name}</p>
              <p className="text-sm text-gray-600">CNPJ: {workshop.cnpj || "___"}</p>
              <div className="mt-4 border-t pt-2">
                <p className="text-xs text-gray-500">Representante Legal</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}