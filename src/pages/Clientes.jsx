import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Users, Star, Phone, Mail, Loader2 } from "lucide-react";

export default function Clientes() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      // Redirecionar admins para a página de admin
      if (currentUser.role === "admin") {
        navigate(createPageUrl("AdminClientes"));
      }
    } catch (error) {
      navigate(createPageUrl("Home"));
    }
  };

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['my-clients'],
    queryFn: () => base44.entities.Client.list('-created_date'),
    enabled: !!user && user.role === "user"
  });

  if (!user || user.role === "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const statusColors = {
    ativo: "bg-green-100 text-green-800",
    inativo: "bg-red-100 text-red-800",
    acompanhamento: "bg-orange-100 text-orange-800"
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Meus Clientes</h1>
          <p className="text-gray-600">Visualize seus clientes atribuídos</p>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Lista de Clientes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
            <Card key={client.id} className="hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{client.full_name}</CardTitle>
                      <Badge className={statusColors[client.status]} className="mt-1">
                        {client.status}
                      </Badge>
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
    </div>
  );
}