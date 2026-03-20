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
  const [openCompanyPopover, setOpenCompanyPopover] = useState(false);

  const { data: firms = [], isLoading: isLoadingFirms } = useQuery({
    queryKey: ['consultingFirms'],
    queryFn: () => base44.entities.ConsultingFirm.list()
  });

  const { data: companies = [], isLoading: isLoadingCompanies } = useQuery({
    queryKey: ['workshops', selectedFirmId],
    queryFn: () => selectedFirmId && selectedFirmId !== 'none' ? base44.entities.Workshop.filter({ consulting_firm_id: selectedFirmId }) : base44.entities.Workshop.list()
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
        <Popover open={openCompanyPopover} onOpenChange={setOpenCompanyPopover}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={openCompanyPopover}
              className="w-[180px] h-8 text-xs bg-white border-0 shadow-sm justify-between px-3 font-normal"
            >
              <span className="truncate">
                {selectedCompanyId && selectedCompanyId !== 'none'
                  ? companies.find((c) => c.id === selectedCompanyId)?.name || "Todas Oficinas"
                  : "Todas Oficinas"}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Pesquisar oficina..." />
              <CommandList>
                <CommandEmpty>Nenhuma oficina encontrada.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="none-Todas Oficinas"
                    onSelect={() => {
                      changeCompany(null);
                      setOpenCompanyPopover(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        (!selectedCompanyId || selectedCompanyId === 'none') ? "opacity-100" : "opacity-0"
                      )}
                    />
                    Todas Oficinas
                  </CommandItem>
                  {companies.map((c) => (
                    <CommandItem
                      key={c.id}
                      value={`${c.name} ${c.id}`}
                      onSelect={() => {
                        changeCompany(c.id);
                        setOpenCompanyPopover(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedCompanyId === c.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {c.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}