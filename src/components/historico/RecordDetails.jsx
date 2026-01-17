import React from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Activity } from "lucide-react";
import { formatCurrency } from "../utils/formatters";

export default function RecordDetails({ record, onEdit, onDelete }) {
  return (
    <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
      {/* Detalhamento de Faturamento */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <p className="text-xs text-blue-700 mb-1">Faturamento Peças</p>
          <p className="text-lg font-bold text-blue-600">
            R$ {formatCurrency(record.revenue_parts)}
          </p>
        </div>
        <div className="bg-green-50 p-3 rounded-lg border border-green-200">
          <p className="text-xs text-green-700 mb-1">Faturamento Serviços</p>
          <p className="text-lg font-bold text-green-600">
            R$ {formatCurrency(record.revenue_services)}
          </p>
        </div>
        <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
          <p className="text-xs text-purple-700 mb-1">Total Faturado</p>
          <p className="text-lg font-bold text-purple-600">
            R$ {formatCurrency(record.revenue_total)}
          </p>
        </div>
      </div>

      {/* Clientes e Ticket Médio */}
      {record.customer_volume > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-200">
            <p className="text-xs text-indigo-700 mb-1">Clientes Atendidos</p>
            <p className="text-lg font-bold text-indigo-600">
              {record.customer_volume} clientes
            </p>
          </div>
          <div className="bg-pink-50 p-3 rounded-lg border border-pink-200">
            <p className="text-xs text-pink-700 mb-1">Ticket Médio</p>
            <p className="text-lg font-bold text-pink-600">
              R$ {formatCurrency(record.average_ticket || 0)}
            </p>
          </div>
        </div>
      )}

      {/* Detalhes Comerciais */}
      {(record.pave_commercial > 0 || record.kit_master > 0 || record.sales_base > 0 || 
        record.sales_marketing > 0 || record.clients_delivered > 0) && (
        <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-200">
          <p className="text-sm font-semibold text-indigo-900 mb-2">🎯 Comercial</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            {record.pave_commercial > 0 && (
              <div>
                <p className="text-gray-600">PAVE (Leads Base):</p>
                <p className="font-bold">{record.pave_commercial} leads</p>
              </div>
            )}
            {record.kit_master > 0 && (
              <div>
                <p className="text-gray-600">Kit Master:</p>
                <p className="font-bold">R$ {formatCurrency(record.kit_master)}</p>
              </div>
            )}
            {record.sales_base > 0 && (
              <div>
                <p className="text-gray-600">Vendas Base:</p>
                <p className="font-bold">R$ {formatCurrency(record.sales_base)}</p>
              </div>
            )}
            {record.sales_marketing > 0 && (
              <div>
                <p className="text-gray-600">Vendas Mkt:</p>
                <p className="font-bold">R$ {formatCurrency(record.sales_marketing)}</p>
              </div>
            )}
            {record.clients_delivered > 0 && (
              <div>
                <p className="text-gray-600">Clientes Entregues:</p>
                <p className="font-bold">{record.clients_delivered}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detalhes de Agendamento - Comercial */}
      {(record.clients_scheduled_base > 0 || record.clients_delivered_base > 0 || 
        record.clients_scheduled_mkt > 0 || record.clients_delivered_mkt > 0 ||
        record.clients_scheduled_referral > 0 || record.clients_delivered_referral > 0) && (
        <div className="bg-teal-50 p-3 rounded-lg border border-teal-200">
          <p className="text-sm font-semibold text-teal-900 mb-2">📅 Agendamentos e Entregas</p>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
            <div>
              <p className="text-gray-600">Agend. Base:</p>
              <p className="font-bold">{record.clients_scheduled_base || 0}</p>
            </div>
            <div>
              <p className="text-gray-600">Entreg. Base:</p>
              <p className="font-bold">{record.clients_delivered_base || 0}</p>
            </div>
            <div>
              <p className="text-gray-600">Agend. Mkt:</p>
              <p className="font-bold">{record.clients_scheduled_mkt || 0}</p>
            </div>
            <div>
              <p className="text-gray-600">Entreg. Mkt:</p>
              <p className="font-bold">{record.clients_delivered_mkt || 0}</p>
            </div>
            <div>
              <p className="text-gray-600">Agend. Indic.:</p>
              <p className="font-bold">{record.clients_scheduled_referral || 0}</p>
            </div>
            <div>
              <p className="text-gray-600">Entreg. Indic.:</p>
              <p className="font-bold">{record.clients_delivered_referral || 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Marketing Data */}
      {record.marketing_data && record.marketing_data.leads_generated > 0 && (
        <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
          <p className="text-sm font-semibold text-purple-900 mb-2">📣 Marketing</p>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs">
            <div>
              <p className="text-gray-600">Leads:</p>
              <p className="font-bold">{record.marketing_data.leads_generated}</p>
            </div>
            <div>
              <p className="text-gray-600">Agendados:</p>
              <p className="font-bold">{record.marketing_data.leads_scheduled}</p>
            </div>
            <div>
              <p className="text-gray-600">Comparec.:</p>
              <p className="font-bold">{record.marketing_data.leads_showed_up}</p>
            </div>
            <div>
              <p className="text-gray-600">Vendidos:</p>
              <p className="font-bold">{record.marketing_data.leads_sold}</p>
            </div>
            <div>
              <p className="text-gray-600">Investido:</p>
              <p className="font-bold">R$ {formatCurrency(record.marketing_data.invested_value || 0)}</p>
            </div>
            <div>
              <p className="text-gray-600">Custo/Venda:</p>
              <p className="font-bold">R$ {formatCurrency(record.marketing_data.cost_per_sale || 0)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Observações */}
      {record.notes && (
        <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-xs font-semibold text-yellow-900 mb-1">📝 Observações</p>
          <p className="text-sm text-gray-700">{record.notes}</p>
        </div>
      )}

      {/* Botões de Ação */}
      <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
        <Button
          size="sm"
          variant="outline"
          onClick={onDelete}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Excluir
        </Button>
        <Button
          size="sm"
          onClick={onEdit}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Activity className="w-4 h-4 mr-2" />
          Editar Registro
        </Button>
      </div>
    </div>
  );
}