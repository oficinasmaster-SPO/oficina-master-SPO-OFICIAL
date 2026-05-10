import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Download, Users, Building2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import WheelLoader from '@/components/ui/WheelLoader';

const fmt = (v) => v || '—';
const fmtDate = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return d; }
};
const fmtMoney = (v) => {
  if (!v && v !== 0) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
};

export default function ClientesAtivosTabela({ isOpen }) {
  const [search, setSearch] = useState('');

  const { data = { clientes: [], total: 0 }, isLoading } = useQuery({
    queryKey: ['clientesAtivosRelatorio'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getClientesAtivosRelatorio', {});
      return res.data || { clientes: [], total: 0 };
    },
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  const clientes = (data.clientes || []).filter(c => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      c.nome_empresa?.toLowerCase().includes(s) ||
      c.cidade?.toLowerCase().includes(s) ||
      c.cnpj?.includes(s) ||
      c.email?.toLowerCase().includes(s) ||
      c.consultor_nome?.toLowerCase().includes(s)
    );
  });

  const exportCSV = () => {
    const headers = [
      'Nome Empresa', 'Razão Social', 'CNPJ', 'Telefone', 'Email',
      'Plano', 'Rua', 'Número', 'Cidade', 'Estado',
      'Fat. Melhor Mês', 'Dt. Início Contrato', 'Dt. Fim Contrato',
      'Consultor', 'Atendimentos Realizados', 'Tempo Consultoria (h)', 'Último Acesso'
    ];
    const rows = clientes.map(c => [
      c.nome_empresa, c.razao_social, c.cnpj, c.telefone, c.email,
      c.plano, c.rua, c.numero, c.cidade, c.estado,
      c.faturamento_melhor_mes || '', c.data_inicio_contrato || '', c.data_fim_contrato || '',
      c.consultor_nome, c.qtd_atendimentos_realizados, c.tempo_consultoria_horas, c.ultimo_acesso || ''
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clientes_ativos_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><WheelLoader size="lg" text="Carregando clientes ativos..." /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Header com totais e busca */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 rounded-lg p-2">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total de clientes ativos</p>
            <p className="text-2xl font-bold text-blue-700">{data.total}</p>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar empresa, cidade, email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 text-sm"
            />
          </div>
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1 shrink-0">
            <Download className="w-4 h-4" />
            CSV
          </Button>
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-xs">
          <thead className="bg-gray-800 text-white">
            <tr>
              <th className="px-3 py-2 text-left whitespace-nowrap">Empresa</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">CNPJ</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">Telefone</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">Email</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">Plano</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">Endereço</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">Cidade/UF</th>
              <th className="px-3 py-2 text-center whitespace-nowrap">Fat. Melhor Mês</th>
              <th className="px-3 py-2 text-center whitespace-nowrap">Início</th>
              <th className="px-3 py-2 text-center whitespace-nowrap">Fim</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">Consultor</th>
              <th className="px-3 py-2 text-center whitespace-nowrap">Atend.</th>
              <th className="px-3 py-2 text-center whitespace-nowrap">Tempo (h)</th>
              <th className="px-3 py-2 text-center whitespace-nowrap">Últ. Acesso</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {clientes.length === 0 ? (
              <tr>
                <td colSpan={14} className="px-4 py-8 text-center text-gray-400">
                  {search ? 'Nenhum cliente encontrado para a busca.' : 'Nenhum cliente ativo encontrado.'}
                </td>
              </tr>
            ) : clientes.map((c, idx) => (
              <tr key={c.id} className={`hover:bg-blue-50/30 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                <td className="px-3 py-2 font-semibold text-gray-900 whitespace-nowrap max-w-[150px] truncate" title={c.nome_empresa}>
                  <div className="flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-gray-400 shrink-0" />
                    <span className="truncate">{fmt(c.nome_empresa)}</span>
                  </div>
                  {c.razao_social && c.razao_social !== c.nome_empresa && (
                    <div className="text-gray-400 text-[10px] truncate" title={c.razao_social}>{c.razao_social}</div>
                  )}
                </td>
                <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{fmt(c.cnpj)}</td>
                <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{fmt(c.telefone)}</td>
                <td className="px-3 py-2 text-gray-600 whitespace-nowrap max-w-[140px] truncate" title={c.email}>{fmt(c.email)}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    c.plano === 'GOLD' || c.plano === 'MILLIONS' || c.plano === 'IOM' ? 'bg-yellow-100 text-yellow-700' :
                    c.plano === 'PRATA' ? 'bg-gray-200 text-gray-700' :
                    c.plano === 'BRONZE' ? 'bg-orange-100 text-orange-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>{c.plano}</span>
                </td>
                <td className="px-3 py-2 text-gray-600 whitespace-nowrap max-w-[120px] truncate" title={`${c.rua} ${c.numero}`}>
                  {c.rua ? `${c.rua}${c.numero ? ', ' + c.numero : ''}` : '—'}
                </td>
                <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                  {c.cidade ? `${c.cidade}/${c.estado}` : '—'}
                </td>
                <td className="px-3 py-2 text-center text-gray-700 font-medium whitespace-nowrap">{fmtMoney(c.faturamento_melhor_mes)}</td>
                <td className="px-3 py-2 text-center text-gray-600 whitespace-nowrap">{fmtDate(c.data_inicio_contrato)}</td>
                <td className="px-3 py-2 text-center text-gray-600 whitespace-nowrap">{fmtDate(c.data_fim_contrato)}</td>
                <td className="px-3 py-2 text-gray-600 whitespace-nowrap max-w-[100px] truncate" title={c.consultor_nome}>{fmt(c.consultor_nome)}</td>
                <td className="px-3 py-2 text-center font-semibold text-gray-800">{c.qtd_atendimentos_realizados}</td>
                <td className="px-3 py-2 text-center text-gray-600">{c.tempo_consultoria_horas > 0 ? c.tempo_consultoria_horas + 'h' : '—'}</td>
                <td className="px-3 py-2 text-center text-gray-500 whitespace-nowrap">{fmtDate(c.ultimo_acesso)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 text-right">
        Exibindo {clientes.length} de {data.total} clientes ativos
      </p>
    </div>
  );
}