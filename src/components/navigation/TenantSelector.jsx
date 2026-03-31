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
    queryFn: async () => {
      // Se tiver firma selecionada, filtra por ela
      if (selectedFirmId && selectedFirmId !== 'none') {
        return base44.entities.Workshop.filter({ consulting_firm_id: selectedFirmId });
      }
      // Se for admin, list() retorna TUDO (limitado a 50 por padrão). 
      // Se for "Todas Oficinas", tentamos buscar apenas as ativas ou aumentamos o limite se necessário, 
      // mas cuidado com performance. 
      return base44.entities.Workshop.list({ limit: 100 }); 
    },
    enabled: !!user && user.role === 'admin' // Só busca se for admin
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
          <PopoverContent className="w-[200px] p-0 bg-white" align="start">
            <Command className="bg-white">
              <CommandInput placeholder="Pesquisar oficina..." className="text-gray-900" />
              <CommandList className="bg-white">
                <CommandEmpty className="text-gray-500">Nenhuma oficina encontrada.</CommandEmpty>
                <CommandGroup className="bg-white">
                  <CommandItem
                    value="none-Todas Oficinas"
                    onSelect={() => {
                      changeCompany(null);
                      setOpenCompanyPopover(false);
                    }}
                    className="text-gray-900 hover:bg-gray-100 cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 text-gray-700",
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
                      className="text-slate-900 hover:bg-slate-100 cursor-pointer font-medium"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 text-slate-700",
                          selectedCompanyId === c.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="text-slate-900 w-full block">{c.name}</span>
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