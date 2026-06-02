import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Brain, User, Calendar, Building } from "lucide-react";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export default function HistoricoDISC() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [diagnostics, setDiagnostics] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [workshops, setWorkshops] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [workshopFilter, setWorkshopFilter] = useState("all");
  const [userRole, setUserRole] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      setUserRole(user.role);

      // Carregar oficinas
      let workshopsData = [];
      if (user.role === 'admin') {
        // Admin vê todas as oficinas
        workshopsData = await base44.entities.Workshop.list();
      } else {
        // Outros usuários vêem apenas suas oficinas
        workshopsData = await base44.entities.Workshop.filter({ owner_id: user.id });
      }

      // Ordenar oficinas alfabeticamente
      const sortedWorkshops = workshopsData.sort((a, b) => 
        a.name.localeCompare(b.name)
      );
      setWorkshops(sortedWorkshops);

      // Se tiver apenas uma oficina, selecionar automaticamente
      if (workshopsData.length === 1) {
        setWorkshopFilter(workshopsData[0].id);
      }

      // Carregar diagnósticos e employees
      const [diagsData, empsData] = await Promise.all([
        base44.entities.DISCDiagnostic.list('-created_date'),
        base44.entities.Employee.list()
      ]);

      setDiagnostics(diagsData);
      setEmployees(empsData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getEmployeeName = (id) => {
    return employees.find(e => e.id === id)?.full_name || "Candidato/Externo";
  };

  const getWorkshopName = (id) => {
    return workshops.find(w => w.id === id)?.name || "Oficina Desconhecida";
  };

  const filteredDiagnostics = diagnostics.filter(d => {
    // Filtro por oficina
    if (workshopFilter !== "all" && d.workshop_id !== workshopFilter) {
      return false;
    }

    // Filtro por nome
    const name = d.employee_id ? getEmployeeName(d.employee_id) : d.candidate_name;
    return name?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (loading) return <div className="flex justify-center h-screen items-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Histórico DISC</h1>
            <p className="text-gray-600">Registro de todas as avaliações realizadas</p>
          </div>
          <Button onClick={() => navigate(createPageUrl("DiagnosticoDISC"))}>Novo Diagnóstico</Button>
        </div>

        {/* Filtros */}
        <div className="grid gap-4 md:grid-cols-2 mb-6">
          <Card>
            <CardContent className="p-4 flex gap-4 items-center">
              <Search className="text-gray-400" />
              <Input 
                placeholder="Buscar por nome..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-none shadow-none focus-visible:ring-0"
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex gap-4 items-center">
              <Building className="text-gray-400" />
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="flex-1 justify-between"
                  >
                    <span className="truncate">
                      {workshopFilter === "all" 
                        ? "Todas as Oficinas" 
                        : workshops.find((ws) => ws.id === workshopFilter)?.name || "Selecionar oficina"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--popover-trigger-width)] p-0">
                  <Command>
                    <CommandInput placeholder="Pesquisar oficina..." />
                    <CommandList>
                      <CommandEmpty>Nenhuma oficina encontrada.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="all"
                          onSelect={() => {
                            setWorkshopFilter("all");
                            setOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              workshopFilter === "all" ? "opacity-100" : "opacity-0"
                            )}
                          />
                          Todas as Oficinas
                        </CommandItem>
                        {workshops.map((ws) => (
                          <CommandItem
                            key={ws.id}
                            value={ws.name}
                            onSelect={() => {
                              setWorkshopFilter(ws.id);
                              setOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                workshopFilter === ws.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {ws.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </CardContent>
          </Card>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Avaliado</TableHead>
                {userRole === 'admin' && <TableHead>Oficina</TableHead>}
                <TableHead>Tipo</TableHead>
                <TableHead>Perfil Dominante</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDiagnostics.map((diag) => (
                <TableRow key={diag.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {format(new Date(diag.created_date), 'dd/MM/yyyy')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="font-semibold">
                        {diag.employee_id ? getEmployeeName(diag.employee_id) : diag.candidate_name}
                      </span>
                    </div>
                  </TableCell>
                  {userRole === 'admin' && (
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-gray-400" />
                        {getWorkshopName(diag.workshop_id)}
                      </div>
                    </TableCell>
                  )}
                  <TableCell>
                    <Badge variant={diag.evaluation_type === 'self' ? 'secondary' : 'default'}>
                      {diag.evaluation_type === 'self' ? 'Autoavaliação' : 'Gestor'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="capitalize text-indigo-600 font-bold">
                      {diag.dominant_profile?.replace('_', ' ')}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(createPageUrl("ResultadoDISC") + `?id=${diag.id}`)}
                    >
                      Ver Resultado
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <div className="mt-4 text-sm text-gray-600">
          <p>Total: {filteredDiagnostics.length} diagnóstico(s) {workshopFilter !== "all" ? `de ${getWorkshopName(workshopFilter)}` : ''}</p>
        </div>
      </div>
    </div>
  );
}