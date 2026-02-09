import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Clock } from "lucide-react";

export default function PaymentStatusTable({ contracts }) {
  if (!contracts || contracts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Status de Pagamentos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500 py-8">Nenhum contrato encontrado</p>
        </CardContent>
      </Card>
    );
  }

  const getPaymentStatus = (contract) => {
    if (contract.payment_confirmed) {
      return { label: "Pago", icon: CheckCircle, color: "bg-green-100 text-green-800" };
    }
    const dueDate = contract.payment_due_date ? new Date(contract.payment_due_date) : null;
    const isOverdue = dueDate && dueDate < new Date();
    
    if (isOverdue) {
      return { label: "Atrasado", icon: AlertCircle, color: "bg-red-100 text-red-800" };
    }
    return { label: "Pendente", icon: Clock, color: "bg-yellow-100 text-yellow-800" };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status de Pagamentos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3 text-xs font-semibold text-gray-700">Contrato</th>
                <th className="text-left p-3 text-xs font-semibold text-gray-700">Oficina</th>
                <th className="text-left p-3 text-xs font-semibold text-gray-700">Valor</th>
                <th className="text-left p-3 text-xs font-semibold text-gray-700">Método</th>
                <th className="text-center p-3 text-xs font-semibold text-gray-700">Status</th>
                <th className="text-left p-3 text-xs font-semibold text-gray-700">Vencimento</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {contracts.map((contract) => {
                const status = getPaymentStatus(contract);
                const StatusIcon = status.icon;
                
                return (
                  <tr key={contract.id} className="hover:bg-gray-50">
                    <td className="p-3 text-sm font-mono font-semibold text-blue-600">
                      {contract.contract_number}
                    </td>
                    <td className="p-3 text-sm">{contract.workshop_name}</td>
                    <td className="p-3 text-sm font-semibold">
                      R$ {contract.contract_value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-sm capitalize">{contract.payment_method || '-'}</td>
                    <td className="p-3 text-center">
                      <Badge className={status.color}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {status.label}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm">
                      {contract.payment_due_date 
                        ? new Date(contract.payment_due_date).toLocaleDateString('pt-BR')
                        : '-'
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}