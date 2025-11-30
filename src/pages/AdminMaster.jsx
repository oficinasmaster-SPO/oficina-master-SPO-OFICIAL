import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAdminSession } from "@/context/AdminSessionContext";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, LogIn, Eye, Building2, Filter, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function AdminMaster() {
  const navigate = useNavigate();
  const { startSession } = useAdminSession();
  const [loading, setLoading] = useState(true);
  const [workshops, setWorkshops] = useState([]);
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    period: "all"
  });
  
  // Estado para modal de sessão
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [selectedWorkshop, setSelectedWorkshop] = useState(null);
  const [sessionForm, setSessionForm] = useState({ reason: "", duration: "60" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado para painel de detalhes (simples)
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [viewWorkshop, setViewWorkshop] = useState(null);

  useEffect(() => {
    checkPermissionAndLoad();
  }, []);

  useEffect(() => {
    loadWorkshops();
  }, [filters.status, filters.period]); // Recarregar ao mudar filtros de servidor

  const checkPermissionAndLoad = async () => {
    try {
      const user = await base44.auth.me();
      
      // Verificação de segurança client-side
      if (user.platform_role !== 'consultoria_owner') {
        toast.error("Acesso negado");
        navigate(createPageUrl("Home"));
        return;
      }
      
      await loadWorkshops();
    } catch (error) {
      console.error(error);
      navigate(createPageUrl("Home"));
    }
  };

  const loadWorkshops = async () => {
    setLoading(true);
    try {
      // Construir query para filtro
      let query = {};
      
      if (filters.status !== 'all') {
        query.status = filters.status;
      }

      // Filtro de busca (client-side filtering se o backend não suportar regex complexo no list básico)
      // Mas vamos tentar buscar tudo e filtrar no cliente por enquanto, já que o volume de teste é pequeno (10 itens).
      // Em produção, usaria paginação real no backend.
      const allWorkshops = await base44.entities.Workshop.list('-created_date', 50); // Limit 50 para teste
      
      let filtered = allWorkshops;

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(w => 
          (w.name && w.name.toLowerCase().includes(searchLower)) || 
          (w.cnpj && w.cnpj.includes(filters.search))
        );
      }

      setWorkshops(filtered);
    } catch (error) {
      console.error("Erro ao carregar oficinas:", error);
      toast.error("Erro ao carregar oficinas");
    } finally {
      setLoading(false);
    }
  };

  const handleStartSessionClick = (workshop) => {
    setSelectedWorkshop(workshop);
    setSessionForm({ reason: "", duration: "60" });
    setSessionModalOpen(true);
  };

  const submitSession = async () => {
    if (!sessionForm.reason) {
      toast.error("Motivo é obrigatório");
      return;
    }

    setIsSubmitting(true);
    const success = await startSession(
      selectedWorkshop.id, 
      sessionForm.reason, 
      parseInt(sessionForm.duration)
    );

    setIsSubmitting(false);
    if (success) {
      setSessionModalOpen(false);
      // Redirecionar para dashboard da oficina
      navigate(createPageUrl("GestaoOficina"));
    }
  };

  const handleViewDetails = (workshop) => {
    setViewWorkshop(workshop);
    setDetailsOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Total de Oficinas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{workshops.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Ativas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {workshops.filter(w => w.status === 'ativo').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Inativas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {workshops.filter(w => w.status === 'inativo').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros e Busca */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input 
                  placeholder="Buscar por Nome ou CNPJ..." 
                  className="pl-10"
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                  onKeyDown={(e) => e.key === 'Enter' && loadWorkshops()}
                />
              </div>
              <Select 
                value={filters.status} 
                onValueChange={(val) => setFilters({...filters, status: val})}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Status</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={loadWorkshops} variant="outline">
                <Filter className="w-4 h-4 mr-2" />
                Filtrar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Oficina</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data Criação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
                    </TableCell>
                  </TableRow>
                ) : workshops.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-gray-500">
                      Nenhuma oficina encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  workshops.map((workshop) => (
                    <TableRow key={workshop.id}>
                      <TableCell>
                        <div className="font-medium">{workshop.name}</div>
                        <div className="text-xs text-gray-500">{workshop.city} - {workshop.state}</div>
                      </TableCell>
                      <TableCell>{workshop.cnpj || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={workshop.status === 'ativo' ? 'success' : 'secondary'} 
                          className={workshop.status === 'ativo' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {workshop.status || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {workshop.created_date ? new Date(workshop.created_date).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => handleViewDetails(workshop)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                          onClick={() => handleStartSessionClick(workshop)}
                        >
                          <LogIn className="w-4 h-4 mr-2" />
                          Modo Master
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Modal de Sessão Master */}
      <Dialog open={sessionModalOpen} onOpenChange={setSessionModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Entrar em Modo Master</DialogTitle>
            <DialogDescription>
              Você terá acesso total à oficina <strong>{selectedWorkshop?.name}</strong>. 
              Esta ação será auditada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Motivo do Acesso *</label>
              <Input 
                value={sessionForm.reason} 
                onChange={(e) => setSessionForm({...sessionForm, reason: e.target.value})}
                placeholder="Ex: Suporte técnico, auditoria..."
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Duração (minutos)</label>
              <Select 
                value={sessionForm.duration} 
                onValueChange={(val) => setSessionForm({...sessionForm, duration: val})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutos</SelectItem>
                  <SelectItem value="60">60 minutos</SelectItem>
                  <SelectItem value="120">2 horas</SelectItem>
                  <SelectItem value="240">4 horas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSessionModalOpen(false)}>Cancelar</Button>
            <Button onClick={submitSession} disabled={isSubmitting} className="bg-purple-600 hover:bg-purple-700">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LogIn className="w-4 h-4 mr-2" />}
              Iniciar Sessão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Painel Lateral Detalhes (Simulado com Dialog por enquanto) */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes da Oficina</DialogTitle>
          </DialogHeader>
          {viewWorkshop && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{viewWorkshop.name}</h3>
                  <p className="text-sm text-gray-500">{viewWorkshop.city} - {viewWorkshop.state}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">CNPJ</p>
                  <p className="font-medium">{viewWorkshop.cnpj || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Segmento</p>
                  <p className="font-medium">{viewWorkshop.segment || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Funcionários</p>
                  <p className="font-medium">{viewWorkshop.employees_count || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Faturamento</p>
                  <p className="font-medium">{viewWorkshop.monthly_revenue || '-'}</p>
                </div>
              </div>
              <div className="pt-4 border-t">
                <p className="text-xs text-gray-400">ID: {viewWorkshop.id}</p>
                <p className="text-xs text-gray-400">Criado em: {new Date(viewWorkshop.created_date).toLocaleString()}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}