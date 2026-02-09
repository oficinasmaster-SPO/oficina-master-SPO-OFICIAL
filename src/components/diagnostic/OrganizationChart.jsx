import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users, TrendingUp, Briefcase } from "lucide-react";

export default function OrganizationChart({ formData }) {
  const ChartNode = ({ title, members, bgColor, borderColor, icon: Icon }) => {
    if (!members || members.length === 0) return null;

    const totalRevenue = members.reduce((sum, m) => sum + (m.delivery_value || 0), 0);
    const totalClients = members.reduce((sum, m) => sum + (m.best_month_clients || 0), 0);

    return (
      <Card className={`${borderColor} border-2`}>
        <CardContent className={`${bgColor} p-4`}>
          <div className="flex items-center gap-2 mb-3">
            <Icon className="w-5 h-5 text-gray-700" />
            <h3 className="font-bold text-gray-900">{title}</h3>
            <span className="ml-auto text-xs font-semibold text-gray-600">
              {members.length} pessoa{members.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
            <div className="bg-white/70 rounded px-2 py-1">
              <p className="text-xs text-gray-600">Faturamento</p>
              <p className="font-bold text-green-700">R$ {totalRevenue.toFixed(0)}</p>
            </div>
            <div className="bg-white/70 rounded px-2 py-1">
              <p className="text-xs text-gray-600">Clientes</p>
              <p className="font-bold text-blue-700">{totalClients}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            {members.map((member, idx) => (
              <div key={idx} className="bg-white/90 rounded-lg p-2 border border-gray-200">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-sm text-gray-900">{member.name || "Não informado"}</p>
                  <span className="text-xs font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                    {member.presence_percentage?.toFixed(1)}%
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-600">Fat: </span>
                    <strong className="text-green-600">R$ {member.delivery_value?.toFixed(0) || 0}</strong>
                  </div>
                  <div>
                    <span className="text-gray-600">Cli: </span>
                    <strong className="text-blue-600">{member.best_month_clients || 0}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Organograma da Empresa</h2>
        <p className="text-gray-600">Hierarquia, distribuição e performance por área</p>
      </div>

      {/* Nível 1 - Sócios */}
      <div className="flex justify-center">
        <div className="w-full max-w-2xl">
          <ChartNode
            title="1º Nível - SÓCIOS"
            members={formData.partners}
            bgColor="bg-gradient-to-br from-purple-50 to-pink-50"
            borderColor="border-purple-300"
            icon={TrendingUp}
          />
        </div>
      </div>

      {/* Nível 2 - Gerentes */}
      {(formData.managers?.general?.length > 0 || 
        formData.managers?.financial?.length > 0 || 
        formData.managers?.stock?.length > 0) && (
        <div className="grid md:grid-cols-3 gap-4">
          {formData.managers.general?.length > 0 && (
            <ChartNode
              title="Gerência Geral"
              members={formData.managers.general}
              bgColor="bg-gradient-to-br from-indigo-50 to-blue-50"
              borderColor="border-indigo-300"
              icon={Briefcase}
            />
          )}
          {formData.managers.financial?.length > 0 && (
            <ChartNode
              title="Gerência Financeira"
              members={formData.managers.financial}
              bgColor="bg-gradient-to-br from-indigo-50 to-blue-50"
              borderColor="border-indigo-300"
              icon={Briefcase}
            />
          )}
          {formData.managers.stock?.length > 0 && (
            <ChartNode
              title="Gerência Estoque"
              members={formData.managers.stock}
              bgColor="bg-gradient-to-br from-indigo-50 to-blue-50"
              borderColor="border-indigo-300"
              icon={Briefcase}
            />
          )}
        </div>
      )}

      {/* Nível 3 - Operacional */}
      <div className="grid md:grid-cols-3 gap-4">
        {formData.operational?.sales?.length > 0 && (
          <ChartNode
            title="2º Nível - VENDAS"
            members={formData.operational.sales}
            bgColor="bg-gradient-to-br from-green-50 to-emerald-50"
            borderColor="border-green-300"
            icon={Users}
          />
        )}
        {formData.operational?.commercial?.length > 0 && (
          <ChartNode
            title="2º Nível - COMERCIAL"
            members={formData.operational.commercial}
            bgColor="bg-gradient-to-br from-blue-50 to-cyan-50"
            borderColor="border-blue-300"
            icon={Users}
          />
        )}
        {formData.operational?.marketing?.length > 0 && (
          <ChartNode
            title="2º Nível - MARKETING"
            members={formData.operational.marketing}
            bgColor="bg-gradient-to-br from-orange-50 to-amber-50"
            borderColor="border-orange-300"
            icon={Users}
          />
        )}
      </div>

      {/* Nível 4 - Técnico e Auxiliar */}
      <div className="grid md:grid-cols-2 gap-4">
        {formData.technical?.length > 0 && (
          <ChartNode
            title="3º Nível - TÉCNICO"
            members={formData.technical}
            bgColor="bg-gradient-to-br from-slate-50 to-gray-50"
            borderColor="border-slate-300"
            icon={Users}
          />
        )}
        {formData.auxiliary?.length > 0 && (
          <ChartNode
            title="3º Nível - AUXILIAR"
            members={formData.auxiliary}
            bgColor="bg-gradient-to-br from-slate-50 to-gray-50"
            borderColor="border-slate-300"
            icon={Users}
          />
        )}
      </div>

      {/* Resumo Geral */}
      <Card className="border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardContent className="p-6">
          <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Resumo Consolidado
          </h3>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 border-2 border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Total Colaboradores</p>
              <p className="text-2xl font-bold text-gray-900">
                {(formData.partners?.length || 0) +
                  (formData.managers?.general?.length || 0) +
                  (formData.managers?.financial?.length || 0) +
                  (formData.managers?.stock?.length || 0) +
                  (formData.operational?.sales?.length || 0) +
                  (formData.operational?.commercial?.length || 0) +
                  (formData.operational?.marketing?.length || 0) +
                  (formData.technical?.length || 0) +
                  (formData.auxiliary?.length || 0)}
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 border-2 border-green-200">
              <p className="text-sm text-gray-600 mb-1">Faturamento Total</p>
              <p className="text-2xl font-bold text-green-700">
                R$ {(
                  (formData.partners?.reduce((s, p) => s + (p.delivery_value || 0), 0) || 0) +
                  (formData.operational?.sales?.reduce((s, p) => s + (p.delivery_value || 0), 0) || 0) +
                  (formData.operational?.commercial?.reduce((s, p) => s + (p.delivery_value || 0), 0) || 0) +
                  (formData.operational?.marketing?.reduce((s, p) => s + (p.delivery_value || 0), 0) || 0) +
                  (formData.technical?.reduce((s, p) => s + (p.delivery_value || 0), 0) || 0) +
                  (formData.auxiliary?.reduce((s, p) => s + (p.delivery_value || 0), 0) || 0)
                ).toFixed(2)}
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 border-2 border-blue-200">
              <p className="text-sm text-gray-600 mb-1">Total Clientes</p>
              <p className="text-2xl font-bold text-blue-700">
                {(formData.partners?.reduce((s, p) => s + (p.best_month_clients || 0), 0) || 0) +
                  (formData.operational?.sales?.reduce((s, p) => s + (p.best_month_clients || 0), 0) || 0) +
                  (formData.operational?.commercial?.reduce((s, p) => s + (p.best_month_clients || 0), 0) || 0) +
                  (formData.operational?.marketing?.reduce((s, p) => s + (p.best_month_clients || 0), 0) || 0) +
                  (formData.technical?.reduce((s, p) => s + (p.best_month_clients || 0), 0) || 0) +
                  (formData.auxiliary?.reduce((s, p) => s + (p.best_month_clients || 0), 0) || 0)}
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 border-2 border-purple-200">
              <p className="text-sm text-gray-600 mb-1">Ticket Médio</p>
              <p className="text-2xl font-bold text-purple-700">
                R$ {(() => {
                  const totalRev = (
                    (formData.partners?.reduce((s, p) => s + (p.delivery_value || 0), 0) || 0) +
                    (formData.operational?.sales?.reduce((s, p) => s + (p.delivery_value || 0), 0) || 0) +
                    (formData.operational?.commercial?.reduce((s, p) => s + (p.delivery_value || 0), 0) || 0) +
                    (formData.operational?.marketing?.reduce((s, p) => s + (p.delivery_value || 0), 0) || 0) +
                    (formData.technical?.reduce((s, p) => s + (p.delivery_value || 0), 0) || 0) +
                    (formData.auxiliary?.reduce((s, p) => s + (p.delivery_value || 0), 0) || 0)
                  );
                  const totalCli = (
                    (formData.partners?.reduce((s, p) => s + (p.best_month_clients || 0), 0) || 0) +
                    (formData.operational?.sales?.reduce((s, p) => s + (p.best_month_clients || 0), 0) || 0) +
                    (formData.operational?.commercial?.reduce((s, p) => s + (p.best_month_clients || 0), 0) || 0) +
                    (formData.operational?.marketing?.reduce((s, p) => s + (p.best_month_clients || 0), 0) || 0) +
                    (formData.technical?.reduce((s, p) => s + (p.best_month_clients || 0), 0) || 0) +
                    (formData.auxiliary?.reduce((s, p) => s + (p.best_month_clients || 0), 0) || 0)
                  );
                  return totalCli > 0 ? (totalRev / totalCli).toFixed(2) : "0.00";
                })()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}