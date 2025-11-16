import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Users, Star, Phone, Mail, Loader2, Shield } from "lucide-react";
import AddClientDialog from "../components/clients/AddClientDialog";

export default function AdminClientes() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);

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

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['admin-clients'],
    queryFn: () => base44.entities.Client.list('-created_date'),
    enabled: !!user && user.role === "admin"
  });

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const planColors = {
    gratis: "bg-gray-100 text-gray-800",
    start: "bg-blue-100 text-blue-800",
    bronze: "bg-amber-100 text-amber-800",
    prata: "bg-slate-200 text-slate-800",
    gold: "bg-yellow-100 text-yellow-800"
  };

  const statusColors = {
    ativo: "bg-green-100 text-green-800",
    inativo: "bg-red-100 text-red-800",
    acompanhamento: "bg-orange-100 text-orange-800"
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlan = filterPlan === "all" || client.plan_type === filterPlan;
    const matchesStatus = filterStatus === "all" || client.status === filterStatus;
    return matchesSearch && matchesPlan && matchesStatus;
  });

  // Estatísticas
  const stats = {
    total: clients.length,
    ativos: clients.filter(c => c.status === 'ativo').length,
    gratis: clients.filter(c => c.plan_type === 'gratis').length,
    pagos: clients.filter(c => c.plan_type !== 'gratis').length
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
          <Button onClick={() => setShowAddDialog(true)} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-5 h-5 mr-2" />
            Novo Cliente
          </Button>
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
                <option value="gratis">Grátis</option>
                <option value="start">Start</option>
                <option value="bronze">Bronze</option>
                <option value="prata">Prata</option>
                <option value="gold">Gold</option>
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

        {/* Lista de Clientes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
            <Card key={client.id} className="hover:shadow-xl transition-shadow border-2">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{client.full_name}</CardTitle>
                      <div className="flex gap-2 mt-1">
                        <Badge className={planColors[client.plan_type]}>
                          {client.plan_type?.toUpperCase()}
                        </Badge>
                        <Badge className={statusColors[client.status]}>
                          {client.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {client.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4" />
                    {client.email}
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4" />
                    {client.phone}
                  </div>
                )}
                {client.cpf_cnpj && (
                  <div className="text-sm text-gray-600">
                    <strong>CPF/CNPJ:</strong> {client.cpf_cnpj}
                  </div>
                )}
                {client.engagement_score > 0 && (
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm text-gray-600">
                      Engajamento: {client.engagement_score.toFixed(0)}%
                    </span>
                  </div>
                )}
                {client.participant_rating > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-gray-600">
                      Avaliação: <strong>{client.participant_rating.toFixed(1)}/10</strong>
                    </div>
                  </div>
                )}
                <div className="text-xs text-gray-500 pt-2 border-t">
                  Criado em: {new Date(client.created_date).toLocaleDateString('pt-BR')}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredClients.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Nenhum cliente encontrado</p>
          </div>
        )}
      </div>

      {showAddDialog && (
        <AddClientDialog
          open={showAddDialog}
          onClose={() => setShowAddDialog(false)}
        />
      )}
    </div>
  );
}