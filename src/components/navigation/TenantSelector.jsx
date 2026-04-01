import React, { useState, useRef } from 'react';
import { useTenant } from '@/components/contexts/TenantContext';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Building2, Briefcase, ChevronUp, ChevronDown, Check, ChevronsUpDown } from 'lucide-react';

export default function TenantSelector() {
  const { user, selectedFirmId, changeConsultingFirm, selectedCompanyId, changeCompany } = useTenant();
  const [openCompanyPopover, setOpenCompanyPopover] = useState(false);
  const listRef = useRef(null);
  const scrollIntervalRef = useRef(null);

  const startScroll = (direction) => {
    scrollIntervalRef.current = setInterval(() => {
      if (listRef.current) {
        listRef.current.scrollTop += direction === 'down' ? 30 : -30;
      }
    }, 60);
  };

  const stopScroll = () => {
    clearInterval(scrollIntervalRef.current);
  };

  const { data: firms = [], isLoading: isLoadingFirms } = useQuery({
    queryKey: ['consultingFirms'],
    queryFn: () => base44.entities.ConsultingFirm.list()
  });

  const { data: companies = [], isLoading: isLoadingCompanies } = useQuery({
    queryKey: ['workshops', selectedFirmId],
    queryFn: async () => {
      if (selectedFirmId && selectedFirmId !== 'none') {
        return base44.entities.Workshop.filter({ consulting_firm_id: selectedFirmId });
      }
      return base44.entities.Workshop.list('-created_date', 100);
    },
    enabled: !!user && user.role === 'admin',
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false
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
          onValueChange={(val) => changeConsultingFirm(val === 'none' ? null : val)}>
          
          <SelectTrigger className="w-[180px] h-8 text-xs bg-white border-0 shadow-sm">
            <SelectValue placeholder="Selecione Consultoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Todas Consultorias</SelectItem>
            {firms.map((f) =>
            <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
            )}
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
              className="w-[180px] h-8 text-xs bg-white border-0 shadow-sm justify-between px-3 font-normal">
              
              <span className="truncate">
                {selectedCompanyId && selectedCompanyId !== 'none' ?
                companies.find((c) => c.id === selectedCompanyId)?.name || "Todas Oficinas" :
                "Todas Oficinas"}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[220px] p-0 bg-white" align="start">
            <Command className="bg-white">
              <CommandInput placeholder="Pesquisar oficina..." className="text-gray-800 text-sm font-normal" />
              <div className="relative">
                {/* Scroll up zone */}
                <div className="bg-gradient-to-b mx-8 px-2 opacity-0 absolute top-0 left-0 right-0 h-7 z-10 flex items-center justify-center hover:opacity-100 transition-all duration-200 from-white via-white/80 to-transparent cursor-pointer group"

                onMouseEnter={() => startScroll('up')}
                onMouseLeave={stopScroll}>
                  
                  <ChevronUp className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                </div>

                <CommandList ref={listRef} className="bg-white max-h-[220px] overflow-y-auto">
                  <CommandEmpty className="text-gray-500 text-sm font-normal py-4 text-center">Nenhuma oficina encontrada.</CommandEmpty>
                  <CommandGroup className="bg-white p-1">
                    <CommandItem
                      value="none-Todas Oficinas"
                      onSelect={() => {
                        changeCompany(null);
                        setOpenCompanyPopover(false);
                      }}
                      className="text-gray-700 text-sm font-normal cursor-pointer rounded px-2 py-1.5 hover:bg-red-50 hover:text-red-600 group/item">
                      
                      <Check
                        className={cn(
                          "mr-2 h-3.5 w-3.5 text-gray-500 shrink-0 group-hover/item:text-red-400",
                          !selectedCompanyId || selectedCompanyId === 'none' ? "opacity-100" : "opacity-0"
                        )} />
                      
                      Todas Oficinas
                    </CommandItem>
                    {[...companies].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map((c) =>
                    <CommandItem
                      key={c.id}
                      value={`${c.name} ${c.id}`}
                      onSelect={() => {
                        changeCompany(c.id);
                        setOpenCompanyPopover(false);
                      }}
                      className="text-gray-700 text-sm font-normal cursor-pointer rounded px-2 py-1.5 hover:bg-red-50 hover:text-red-600 group/item">
                      
                        <Check
                        className={cn(
                          "mr-2 h-3.5 w-3.5 text-gray-500 shrink-0 group-hover/item:text-red-400",
                          selectedCompanyId === c.id ? "opacity-100" : "opacity-0"
                        )} />
                      
                        <span className="truncate">{c.name}</span>
                      </CommandItem>
                    )}
                  </CommandGroup>
                </CommandList>

                {/* Scroll down zone */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-7 z-10 flex items-center justify-center opacity-0 hover:opacity-100 transition-all duration-200 bg-gradient-to-t from-white via-white/80 to-transparent cursor-pointer group"
                  onMouseEnter={() => startScroll('down')}
                  onMouseLeave={stopScroll}>
                  
                  <ChevronDown className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                </div>
              </div>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>);

}