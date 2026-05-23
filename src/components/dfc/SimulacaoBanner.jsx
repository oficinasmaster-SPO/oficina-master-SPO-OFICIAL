import React from "react";
import { AlertCircle, FlaskConical } from "lucide-react";

export default function SimulacaoBanner({ ativo, onToggle }) {
  return (
    <div className={`rounded-lg p-4 border-2 flex items-start gap-3 ${
      ativo 
        ? 'bg-purple-50 border-purple-300' 
        : 'bg-gray-50 border-gray-200'
    }`}>
      <div className={`p-2 rounded-full ${
        ativo ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500'
      }`}>
        {ativo ? <FlaskConical className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
      </div>
      <div className="flex-1">
        <h4 className={`text-sm font-semibold ${
          ativo ? 'text-purple-800' : 'text-gray-700'
        }`}>
          {ativo ? '🧪 MODO SIMULAÇÃO ATIVO' : '🧪 Modo Simulação Disponível'}
        </h4>
        <p className={`text-xs mt-1 ${
          ativo ? 'text-purple-700' : 'text-gray-600'
        }`}>
          {ativo 
            ? 'Os dados não estão sendo persistidos no banco de dados. Use este modo para testar a interface e funcionalidades sem alterar dados reais.'
            : 'Clique no botão "Modo Simulação" no topo para ativar dados fictícios e testar sem persistir no banco.'
          }
        </p>
      </div>
    </div>
  );
}