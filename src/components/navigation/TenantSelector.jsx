import React from 'react';
import { useTenant } from '@/components/contexts/TenantContext';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Briefcase } from 'lucide-react';

export default function TenantSelector() {
  const { user, selectedFirmId, changeConsultingFirm, selectedCompanyId, changeCompany } = useTenant();

  const { data: firms = [], isLoading: isLoadingFirms } = useQuery({
    queryKey: ['consultingFirms'],
    queryFn: () => base44.entities.ConsultingFirm.list()
  });

  const { data: companies = [], isLoading: isLoadingCompanies } = useQuery({
    queryKey: ['companies', selectedFirmId],
    queryFn: () => selectedFirmId ? base44.entities.Company.filter({ consulting_firm_id: selectedFirmId }) : [],
    enabled: !!selectedFirmId
  });

  // Apenas admins podem alternar entre tenants livremente por enquanto
  if (user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="hidden md:flex items-center gap-3 ml-4">
      <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border border-gray-200">
        <Building2 className="w-4 h-4 text-gray-500 ml-2" />
        <Select 
          value={selectedFirmId || 'none'} 
          onValueChange={(val) => changeConsultingFirm(val === 'none' ? null : val)}
        >
          <SelectTrigger className="w-[180px] h-8 text-xs bg-white border-0 shadow-sm">
            <SelectValue placeholder="Selecione Consultoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Todas Consultorias</SelectItem>
            {firms.map(f => (
              <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border border-gray-200">
        <Briefcase className="w-4 h-4 text-gray-500 ml-2" />
        <Select 
          value={selectedCompanyId || 'none'} 
          onValueChange={(val) => changeCompany(val === 'none' ? null : val)} 
          disabled={!selectedFirmId}
        >
          <SelectTrigger className="w-[180px] h-8 text-xs bg-white border-0 shadow-sm">
            <SelectValue placeholder="Selecione Empresa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Todas Empresas</SelectItem>
            {companies.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}