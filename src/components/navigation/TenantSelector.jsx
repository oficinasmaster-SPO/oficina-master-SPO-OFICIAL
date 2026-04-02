import React, { useState } from 'react';
import { useTenant } from '@/components/contexts/TenantContext';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Building2, Briefcase, Search, Check, ChevronsUpDown } from 'lucide-react';

export default function TenantSelector() {
  const { user, selectedFirmId, changeConsultingFirm, selectedCompanyId, changeCompany } = useTenant();
  const [openFirmPopover, setOpenFirmPopover] = useState(false);
  const [openCompanyPopover, setOpenCompanyPopover] = useState(false);
  const [firmSearchTerm, setFirmSearchTerm] = useState('');
  const [companySearchTerm, setCompanySearchTerm] = useState('');
  const [hoveredFirmId, setHoveredFirmId] = useState(null);
  const [hoveredCompanyId, setHoveredCompanyId] = useState(null);

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

  const selectedFirm = firms?.find(f => f.id === selectedFirmId);
  const selectedCompany = companies?.find(c => c.id === selectedCompanyId);
  
  const filteredFirms = firms?.filter(f => 
    f.name.toLowerCase().includes(firmSearchTerm.toLowerCase())
  ) || [];
  
  const filteredCompanies = companies?.filter(c => 
    `${c.name} ${c.city} ${c.state}`.toLowerCase().includes(companySearchTerm.toLowerCase())
  ) || [];

  // Apenas admins podem alternar entre tenants livremente
  if (user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="hidden md:flex items-center gap-3 ml-4">
      <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border border-gray-200">
        <Building2 className="w-4 h-4 text-gray-500 ml-2" />
        <Popover open={openFirmPopover} onOpenChange={setOpenFirmPopover}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={openFirmPopover}
              className="w-[180px] h-8 text-xs bg-white border-0 shadow-sm justify-between px-3 font-normal"
            >
              <span className="truncate">
                {selectedFirm 
                  ? `${selectedFirm.name}`
                  : "Todas Consultorias"}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[220px] p-0" align="start">
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input 
                className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Pesquisar consultoria..." 
                value={firmSearchTerm}
                onChange={(e) => setFirmSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="border-b px-3 py-2 text-xs text-gray-600 bg-gray-50 font-medium">
              Todas Consultorias
            </div>

            <div className="max-h-64 overflow-y-auto pr-2" style={{ scrollbarGutter: 'stable' }}>
              {filteredFirms.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-gray-500">
                  Nenhuma consultoria encontrada
                </div>
              ) : (
                <>
                  <div
                    onClick={() => {
                      changeConsultingFirm(null);
                      setOpenFirmPopover(false);
                      setFirmSearchTerm('');
                    }}
                    onMouseEnter={() => setHoveredFirmId('all')}
                    onMouseLeave={() => setHoveredFirmId(null)}
                    style={{
                      backgroundColor: hoveredFirmId === 'all' ? '#dc2626' : 'transparent',
                      color: hoveredFirmId === 'all' ? 'white' : 'black',
                      cursor: 'pointer',
                      padding: '8px 12px',
                      transition: 'background-color 0.15s ease-out'
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Check
                        className={cn(
                          "h-4 w-4 flex-shrink-0",
                          !selectedFirmId ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="font-medium text-sm">Todas Consultorias</span>
                    </div>
                  </div>
                  
                  {filteredFirms.map((firm) => (
                    <div
                      key={firm.id}
                      onClick={() => {
                        changeConsultingFirm(firm.id);
                        setOpenFirmPopover(false);
                        setFirmSearchTerm('');
                      }}
                      onMouseEnter={() => setHoveredFirmId(firm.id)}
                      onMouseLeave={() => setHoveredFirmId(null)}
                      style={{
                        backgroundColor: hoveredFirmId === firm.id ? '#dc2626' : 'transparent',
                        color: hoveredFirmId === firm.id ? 'white' : 'black',
                        cursor: 'pointer',
                        padding: '8px 12px',
                        transition: 'background-color 0.15s ease-out'
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Check
                          className={cn(
                            "h-4 w-4 flex-shrink-0",
                            selectedFirmId === firm.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span className="font-medium text-sm">{firm.name}</span>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>
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
                {selectedCompany 
                  ? `${selectedCompany.name}`
                  : "Todas Oficinas"}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[220px] p-0" align="start">
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input 
                className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Pesquisar oficina..." 
                value={companySearchTerm}
                onChange={(e) => setCompanySearchTerm(e.target.value)}
              />
            </div>
            
            <div className="border-b px-3 py-2 text-xs text-gray-600 bg-gray-50 font-medium">
              Todas Oficinas
            </div>

            <div className="max-h-64 overflow-y-auto pr-2" style={{ scrollbarGutter: 'stable' }}>
              {filteredCompanies.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-gray-500">
                  Nenhuma oficina encontrada
                </div>
              ) : (
                <>
                  <div
                    onClick={() => {
                      changeCompany(null);
                      setOpenCompanyPopover(false);
                      setCompanySearchTerm('');
                    }}
                    onMouseEnter={() => setHoveredCompanyId('all')}
                    onMouseLeave={() => setHoveredCompanyId(null)}
                    style={{
                      backgroundColor: hoveredCompanyId === 'all' ? '#dc2626' : 'transparent',
                      color: hoveredCompanyId === 'all' ? 'white' : 'black',
                      cursor: 'pointer',
                      padding: '8px 12px',
                      transition: 'background-color 0.15s ease-out'
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Check
                        className={cn(
                          "h-4 w-4 flex-shrink-0",
                          !selectedCompanyId ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="font-medium text-sm">Todas Oficinas</span>
                    </div>
                  </div>
                  
                  {filteredCompanies.map((company) => (
                    <div
                      key={company.id}
                      onClick={() => {
                        changeCompany(company.id);
                        setOpenCompanyPopover(false);
                        setCompanySearchTerm('');
                      }}
                      onMouseEnter={() => setHoveredCompanyId(company.id)}
                      onMouseLeave={() => setHoveredCompanyId(null)}
                      style={{
                        backgroundColor: hoveredCompanyId === company.id ? '#dc2626' : 'transparent',
                        color: hoveredCompanyId === company.id ? 'white' : 'black',
                        cursor: 'pointer',
                        padding: '8px 12px',
                        transition: 'background-color 0.15s ease-out'
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <Check
                          className={cn(
                            "h-4 w-4 mt-0.5 flex-shrink-0",
                            selectedCompanyId === company.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="font-medium text-sm">{company.name}</span>
                          <span className="text-xs" style={{opacity: hoveredCompanyId === company.id ? 0.7 : 1, color: hoveredCompanyId === company.id ? 'white' : '#9ca3af'}}>
                            {company.city}/{company.state}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}