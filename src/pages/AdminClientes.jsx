import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Users, Star, Phone, Mail, Loader2, Shield, Building2, MapPin } from "lucide-react";
export default function AdminClientes() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      if (currentUser.role !== "admin") {
        navigate(createPageUrl("Home"));
      }
    } catch (error) {
      navigate(createPageUrl("Home"));
    }
  };

  const { data: workshops = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-workshops'],
    queryFn: () => base44.entities.Workshop.list('-created_date'),
    enabled: !!user && user.role === "admin"
  });

  const handleUpdateStatus = async (workshopId, newStatus) => {
    await base44.entities.Workshop.update(workshopId, { status: newStatus });
    refetch();
  };

  const handleUpdatePlan = async (workshopId, newPlan) => {
    await base44.entities.Workshop.update(workshopId, { planoAtual: newPlan });
    refetch();
  };

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const planColors = {
    FREE: "bg-gray-100 text-gray-800",
    START: "bg-blue-100 text-blue-800",
    BRONZE: "bg-amber-100 text-amber-800",
    PRATA: "bg-slate-200 text-slate-800",
    GOLD: "bg-yellow-100 text-yellow-800",
    IOM: "bg-purple-100 text-purple-800",
    MILLIONS: "bg-green-100 text-green-800"
  };

  const statusColors = {
    ativo: "bg-green-100 text-green-800",
    inativo: "bg-red-100 text-red-800",
    acompanhamento: "bg-orange-100 text-orange-800"
  };

  const filteredWorkshops = workshops.filter(w => {
    const matchesSearch = w.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         w.city?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlan = filterPlan === "all" || w.planoAtual === filterPlan;
    const matchesStatus = filterStatus === "all" || w.status === filterStatus;
    return matchesSearch && matchesPlan && matchesStatus;
  });

  // Estatísticas
  const stats = {
    total: workshops.length,
    ativos: workshops.filter(w => w.status === 'ativo').length,
    gratis: workshops.filter(w => w.planoAtual === 'FREE').length,
    pagos: workshops.filter(w => w.planoAtual !== 'FREE').length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-8 h-8 text-purple-600" />
              <h1 className="text-4xl font-bold text-gray-900">Gestão de Clientes - Admin</h1>
            </div>
            <p className="text-gray-600">Painel administrativo da plataforma</p>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600 mb-1">Total de Clientes</div>
              <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600 mb-1">Clientes Ativos</div>
              <div className="text-3xl font-bold text-green-600">{stats.ativos}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600 mb-1">Planos Gratuitos</div>
              <div className="text-3xl font-bold text-gray-600">{stats.gratis}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600 mb-1">Planos Pagos</div>
              <div className="text-3xl font-bold text-blue-600">{stats.pagos}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={filterPlan}
                onChange={(e) => setFilterPlan(e.target.value)}
                className="px-3 py-2 border rounded-lg"
              >
                <option value="all">Todos os Planos</option>
                <option value="FREE">FREE</option>
                <option value="START">START</option>
                <option value="BRONZE">BRONZE</option>
                <option value="PRATA">PRATA</option>
                <option value="GOLD">GOLD</option>
                <option value="IOM">IOM</option>
                <option value="MILLIONS">MILLIONS</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border rounded-lg"
              >
                <option value="all">Todos os Status</option>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
                <option value="acompanhamento">Acompanhamento</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Oficinas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWorkshops.map((workshop) => (
            <Card key={workshop.id} className="hover:shadow-xl transition-shadow border-2">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div className="overflow-hidden">
                      <CardTitle className="text-lg truncate w-48" title={workshop.name}>{workshop.name}</CardTitle>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        <Badge className={planColors[workshop.planoAtual] || 'bg-gray-100'}>
                          {workshop.planoAtual}
                        </Badge>
                        <Badge className={statusColors[workshop.status] || 'bg-gray-100'}>
                          {workshop.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {workshop.city && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    {workshop.city} - {workshop.state}
                  </div>
                )}
                {workshop.cnpj && (
                  <div className="text-sm text-gray-600">
                    <strong>CNPJ:</strong> {workshop.cnpj}
                  </div>
                )}
                
                <div className="pt-2 border-t grid grid-cols-2 gap-2">
                    <div>
                        <label className="text-xs text-gray-500">Alterar Status</label>
                        <select 
                            className="w-full text-xs border rounded p-1 mt-1"
                            value={workshop.status}
                            onChange={(e) => handleUpdateStatus(workshop.id, e.target.value)}
                        >
                            <option value="ativo">Ativo</option>
                            <option value="inativo">Inativo</option>
                            <option value="acompanhamento">Acompanhamento</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-gray-500">Alterar Plano</label>
                        <select 
                            className="w-full text-xs border rounded p-1 mt-1"
                            value={workshop.planoAtual}
                            onChange={(e) => handleUpdatePlan(workshop.id, e.target.value)}
                        >
                            <option value="FREE">FREE</option>
                            <option value="START">START</option>
                            <option value="BRONZE">BRONZE</option>
                            <option value="PRATA">PRATA</option>
                            <option value="GOLD">GOLD</option>
                            <option value="IOM">IOM</option>
                            <option value="MILLIONS">MILLIONS</option>
                        </select>
                    </div>
                </div>

                <div className="text-xs text-gray-500 pt-2 border-t flex justify-between">
                   <span>Criado em: {new Date(workshop.created_date).toLocaleDateString('pt-BR')}</span>
                   {workshop.engagement_score > 0 && (
                       <span className="flex items-center gap-1 text-yellow-600 font-bold">
                           <Star className="w-3 h-3" /> {workshop.engagement_score}%
                       </span>
                   )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredWorkshops.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Nenhuma oficina encontrada</p>
          </div>
        )}
      </div>

    </div>
  );
}