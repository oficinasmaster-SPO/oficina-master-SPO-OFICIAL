import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ContractPreview({ contract, workshop }) {
  if (!contract || !workshop) return null;

  const replaceVariables = (text) => {
    if (!text) return "";
    
    return text
      .replace(/\[RAZÃO SOCIAL DA EMPRESA\]/gi, workshop.razao_social || workshop.name || "")
      .replace(/\[CNPJ\]/gi, workshop.cnpj || "___")
      .replace(/\[ENDEREÇO COMPLETO.*?\]/gi, workshop.endereco_completo || `${workshop.endereco_rua || ""} ${workshop.endereco_numero || ""}, ${workshop.endereco_bairro || ""}, ${workshop.city || ""}/${workshop.state || ""}, CEP: ${workshop.cep || ""}`)
      .replace(/\[NOME DO REPRESENTANTE LEGAL\]/gi, workshop.owner_name || "___")
      .replace(/\[CPF\]/gi, "___")
      .replace(/\[E-MAIL\]/gi, workshop.email || "___")
      .replace(/\[TELEFONE\]/gi, workshop.telefone || "___")
      .replace(/{{workshop_name}}/gi, workshop.name || "")
      .replace(/{{razao_social}}/gi, workshop.razao_social || workshop.name || "")
      .replace(/{{cnpj}}/gi, workshop.cnpj || "___")
      .replace(/{{city}}/gi, workshop.city || "___")
      .replace(/{{state}}/gi, workshop.state || "___")
      .replace(/{{endereco_completo}}/gi, workshop.endereco_completo || `${workshop.endereco_rua || ""} ${workshop.endereco_numero || ""}, ${workshop.endereco_bairro || ""}, ${workshop.city || ""}/${workshop.state || ""}, CEP: ${workshop.cep || ""}`)
      .replace(/{{plan_type}}/gi, contract.plan_type || "")
      .replace(/{{contract_value}}/gi, `R$ ${contract.contract_value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || "0,00"}`)
      .replace(/{{duration}}/gi, contract.contract_duration_months || 12)
      .replace(/{{setup_fee}}/gi, contract.setup_fee ? `R$ ${contract.setup_fee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : "R$ 0,00")
      .replace(/{{setup_date}}/gi, contract.setup_date ? new Date(contract.setup_date).toLocaleDateString('pt-BR') : "___")
      .replace(/{{installment_value}}/gi, contract.installment_value ? `R$ ${contract.installment_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : "R$ 0,00")
      .replace(/{{installment_due_day}}/gi, contract.installment_due_day || "___")
      .replace(/{{contract_date}}/gi, format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }));
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
          id="contract-preview-content"
          className="prose prose-sm max-w-none text-justify leading-relaxed"
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