import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

export default function ProposalPreview({ proposal, candidate, workshop, onSend, isLoading }) {
  if (!proposal) {
    return <Card className="p-12 text-center text-gray-500">Proposta ainda não criada</Card>;
  }

  const totalCompensation = (proposal.fixed_salary || 0) + (proposal.variable_bonus || 0);

  return (
    <Card className="p-8 space-y-6">
      <div className="text-center border-b pb-4">
        <h2 className="text-2xl font-bold">{workshop.name}</h2>
        <p className="text-gray-600">Proposta de Emprego</p>
      </div>

      <div>
        <p className="text-gray-600 mb-2">Prezado(a),</p>
        <p className="text-gray-700">{candidate.full_name}</p>
      </div>

      <div className="bg-blue-50 p-4 rounded">
        <h3 className="font-bold mb-2">Cargo: {proposal.position}</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Salário Fixo</p>
            <p className="font-bold text-lg">R$ {proposal.fixed_salary?.toLocaleString('pt-BR')}</p>
          </div>
          {proposal.variable_bonus > 0 && (
            <div>
              <p className="text-gray-600">Bônus/Variável</p>
              <p className="font-bold text-lg">R$ {proposal.variable_bonus?.toLocaleString('pt-BR')}</p>
            </div>
          )}
        </div>
        <div className="mt-2 pt-2 border-t">
          <p className="text-gray-600">Remuneração Total</p>
          <p className="font-bold text-2xl text-blue-600">R$ {totalCompensation.toLocaleString('pt-BR')}</p>
        </div>
      </div>

      <div>
        <h4 className="font-bold mb-2">Jornada de Trabalho</h4>
        <p>{proposal.workload}</p>
      </div>

      {proposal.benefits && proposal.benefits.length > 0 && (
        <div>
          <h4 className="font-bold mb-2">Benefícios</h4>
          <ul className="list-disc list-inside space-y-1">
            {proposal.benefits.map((b, idx) => (
              <li key={idx}>{b.name} {b.value > 0 && `- R$ ${b.value}`}</li>
            ))}
          </ul>
        </div>
      )}

      {proposal.company_expectations && (
        <div>
          <h4 className="font-bold mb-2">Expectativas da Empresa</h4>
          <p className="text-gray-700">{proposal.company_expectations}</p>
        </div>
      )}

      <Button 
        onClick={onSend} 
        disabled={isLoading || proposal.status === 'enviada'} 
        className="w-full"
      >
        <Send className="w-4 h-4 mr-2" />
        {proposal.status === 'enviada' ? 'Proposta Enviada' : 'Enviar Proposta'}
      </Button>
    </Card>
  );
}