import React, { useState } from 'react';
import { useTenant } from '@/components/contexts/TenantContext';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Building2, Briefcase, Search, Check, ChevronsUpDown } from 'lucide-react';

export default function TenantSelector() {
  const { user, selectedFirmId, changeConsultingFirm, selectedCompanyId, changeCompany } = useTenant();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: firms = [], isLoading: isLoadingFirms } = useQuery({
    queryKey: ['consultingFirms'],
    queryFn: () => base44.entities.ConsultingFirm.list()
  });

  const { data: companies = [], isLoading: isLoadingCompanies } = useQuery({
    queryKey: ['workshops', selectedFirmId],
    queryFn: () => selectedFirmId && selectedFirmId !== 'none' ? base44.entities.Workshop.filter({ consulting_firm_id: selectedFirmId }) : base44.entities.Workshop.list()
  });

  const filteredCompanies = companies.filter(c => 
    c.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        >
          <SelectTrigger className="w-[180px] h-8 text-xs bg-white border-0 shadow-sm">
            <SelectValue placeholder="Selecione Oficina" />
          </SelectTrigger>
          <SelectContent>
            <div className="flex items-center px-3 pb-2 pt-2 border-b mb-1 sticky top-0 bg-white z-10">
              <Search className="w-4 h-4 text-gray-400 mr-2" />
              <input
                type="text"
                placeholder="Pesquisar oficina..."
                className="w-full text-sm outline-none bg-transparent"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <SelectItem value="none">Todas Oficinas</SelectItem>
            {filteredCompanies.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
            {filteredCompanies.length === 0 && (
              <div className="px-2 py-4 text-sm text-center text-gray-500">
                Nenhuma oficina encontrada
              </div>
            )}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}