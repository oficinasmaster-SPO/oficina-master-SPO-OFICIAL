import React from "react";

export default function ReportHeader({ workshop, employee, user, title, subtitle }) {
  const formatDate = (date) => {
    if (!date) return new Date().toLocaleDateString('pt-BR');
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const jobRoleLabels = {
    socio: "Sócio",
    diretor: "Diretor",
    supervisor_loja: "Supervisor",
    gerente: "Gerente",
    lider_tecnico: "Líder Técnico",
    financeiro: "Financeiro",
    rh: "RH",
    tecnico: "Técnico",
    funilaria_pintura: "Funilaria/Pintura",
    comercial: "Comercial",
    consultor_vendas: "Consultor de Vendas",
    marketing: "Marketing",
    estoque: "Estoque",
    administrativo: "Administrativo",
    motoboy: "Motoboy",
    lavador: "Lavador",
    acelerador: "Acelerador",
    consultor: "Consultor",
    outros: "Outros"
  };

  const areaLabels = {
    vendas: "Vendas",
    comercial: "Comercial",
    marketing: "Marketing",
    tecnico: "Técnico",
    administrativo: "Administrativo",
    financeiro: "Financeiro",
    gerencia: "Gerência"
  };

  return (
    <div className="print-header bg-white border-b-2 border-gray-300 pb-4 mb-6">
      <div className="flex items-start justify-between gap-4">
        {/* Logo e Nome da Empresa */}
        <div className="flex items-center gap-4">
          {workshop?.logo_url && (
            <img 
              src={workshop.logo_url} 
              alt="Logo"
              className="w-16 h-16 object-contain"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {workshop?.name || 'Oficina'}
            </h1>
            <p className="text-sm text-gray-600">
              {workshop?.segment || workshop?.segment_auto || 'Automotiva'}
            </p>
            {workshop?.cnpj && (
              <p className="text-xs text-gray-500">CNPJ: {workshop.cnpj}</p>
            )}
          </div>
        </div>

        {/* Data */}
        <div className="text-right">
          <p className="text-sm text-gray-600">Data de Emissão</p>
          <p className="text-sm font-semibold text-gray-900">{formatDate()}</p>
        </div>
      </div>

      {/* Título do Documento */}
      <div className="mt-6 border-t border-gray-200 pt-4">
        <h2 className="text-xl font-bold text-gray-900 uppercase">{title}</h2>
        {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
      </div>

      {/* Dados do Colaborador */}
      {employee && (
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-blue-700 font-semibold uppercase">Colaborador</p>
              <p className="text-sm text-blue-900 font-medium">{employee.full_name}</p>
            </div>
            <div>
              <p className="text-xs text-blue-700 font-semibold uppercase">Cargo</p>
              <p className="text-sm text-blue-900">
                {jobRoleLabels[employee.job_role] || employee.position || 'Não definido'}
              </p>
            </div>
            <div>
              <p className="text-xs text-blue-700 font-semibold uppercase">Área</p>
              <p className="text-sm text-blue-900">
                {areaLabels[employee.area] || employee.area || 'Não definida'}
              </p>
            </div>
            <div>
              <p className="text-xs text-blue-700 font-semibold uppercase">Data de Admissão</p>
              <p className="text-sm text-blue-900">
                {employee.hire_date ? formatDate(employee.hire_date) : '-'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}