import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  Loader2, CheckCircle, XCircle, Clock, UserCheck, 
  Mail, Phone, Briefcase, Shield, AlertCircle 
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AprovarColaboradores() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);

  useEffect(() => {
    loadUserAndWorkshop();
  }, []);

  const loadUserAndWorkshop = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const workshops = await base44.entities.Workshop.filter({ owner_id: currentUser.id });
      const userWorkshop = workshops[0];
      
      if (!userWorkshop) {
        toast.error("Oficina não encontrada");
        return;
      }
      
      setWorkshop(userWorkshop);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados");
    }
  };

  // Buscar colaboradores pendentes
  const { data: pendingEmployees = [], isLoading } = useQuery({
    queryKey: ['pending-employees', workshop?.id],
    queryFn: async () => {
      if (!workshop?.id) return [];
      const employees = await base44.entities.Employee.filter({ 
        workshop_id: workshop.id,
        user_status: "pending"
      });
      return employees || [];
    },
    enabled: !!workshop?.id
  });

  // Buscar perfis disponíveis
  const { data: profiles = [] } = useQuery({
    queryKey: ['user-profiles'],
    queryFn: async () => {
      const allProfiles = await base44.entities.UserProfile.list();
      return allProfiles.filter(p => p.type === 'cliente' && p.status === 'ativo');
    }
  });

  // Mutação para aprovar acesso
  const approveAccessMutation = useMutation({
    mutationFn: async ({ employeeId, profileId }) => {
      const result = await base44.functions.invoke('approveUserAccess', { 
        employee_id: employeeId,
        profile_id: profileId
      });
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['pending-employees']);
      toast.success("Acesso aprovado! Colaborador pode fazer login agora.");
    },
    onError: (error) => {
      toast.error("Erro ao aprovar: " + error.message);
    }
  });

  // Mutação para rejeitar acesso
  const rejectAccessMutation = useMutation({
    mutationFn: async (employeeId) => {
      await base44.entities.Employee.update(employeeId, { 
        user_status: "rejected" 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['pending-employees']);
      toast.success("Acesso rejeitado");
    },
    onError: (error) => {
      toast.error("Erro ao rejeitar: " + error.message);
    }
  });

  const [selectedProfiles, setSelectedProfiles] = useState({});

  const handleApprove = (employee) => {
    const profileId = selectedProfiles[employee.id];
    
    if (!profileId) {
      toast.error("Selecione um perfil de acesso para este colaborador");
      return;
    }

    if (confirm(`Aprovar acesso de ${employee.full_name}?`)) {
      approveAccessMutation.mutate({ 
        employeeId: employee.id, 
        profileId 
      });
    }
  };

  const handleReject = (employee) => {
    if (confirm(`Rejeitar acesso de ${employee.full_name}?\n\nO colaborador precisará solicitar novo convite.`)) {
      rejectAccessMutation.mutate(employee.id);
    }
  };

  if (!workshop) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Carregando colaboradores pendentes...</span>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <UserCheck className="w-8 h-8 text-blue-600" />
            Aprovar Colaboradores
          </h1>
          <p className="text-gray-600 mt-2">
            Revise e aprove o acesso de novos colaboradores ao sistema
          </p>
        </div>
        <Badge className="bg-yellow-100 text-yellow-800 text-lg px-4 py-2">
          <Clock className="w-5 h-5 mr-2" />
          {pendingEmployees.length} Pendente{pendingEmployees.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {pendingEmployees.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Nenhuma aprovação pendente
            </h2>
            <p className="text-gray-600">
              Todos os colaboradores foram aprovados ou ainda não se cadastraram.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {pendingEmployees.map((employee) => (
            <Card key={employee.id} className="border-2 border-yellow-200 shadow-lg">
              <CardHeader className="bg-yellow-50 border-b border-yellow-200">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {employee.profile_picture_url ? (
                      <img 
                        src={employee.profile_picture_url} 
                        alt={employee.full_name}
                        className="w-16 h-16 rounded-full object-cover border-2 border-yellow-300"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center border-2 border-yellow-300">
                        <UserCheck className="w-8 h-8 text-yellow-600" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-xl">{employee.full_name}</CardTitle>
                        {employee.identificador && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded">
                            {employee.identificador}
                          </span>
                        )}
                      </div>
                      <Badge className="bg-yellow-100 text-yellow-800 mt-1">
                        <Clock className="w-3 h-3 mr-1" />
                        Aguardando Aprovação
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <p>Cadastro realizado em:</p>
                    <p className="font-medium text-gray-700">
                      {employee.first_login_at 
                        ? format(new Date(employee.first_login_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                        : format(new Date(employee.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                      }
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6 pt-6">
                {/* Informações do Colaborador */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="font-medium text-gray-900">{employee.email}</p>
                    </div>
                  </div>

                  {employee.telefone && (
                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500">Telefone</p>
                        <p className="font-medium text-gray-900">{employee.telefone}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <Briefcase className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500">Cargo</p>
                      <p className="font-medium text-gray-900">{employee.position}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500">Área</p>
                      <p className="font-medium text-gray-900 capitalize">{employee.area}</p>
                    </div>
                  </div>

                  {workshop?.identificador && (
                    <div className="flex items-start gap-3">
                      <Briefcase className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500">Empresa</p>
                        <p className="font-medium text-gray-900">{workshop.identificador}</p>
                      </div>
                    </div>
                  )}
                  </div>

                {/* Alerta de Configuração */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-semibold mb-1">Configuração Necessária</p>
                      <p>
                        Selecione um perfil de acesso para definir as permissões que este colaborador terá no sistema.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Seleção de Perfil */}
                <div className="space-y-2">
                  <Label htmlFor={`profile-${employee.id}`}>
                    Perfil de Acesso *
                  </Label>
                  <Select
                    value={selectedProfiles[employee.id] || ""}
                    onValueChange={(value) => setSelectedProfiles({
                      ...selectedProfiles,
                      [employee.id]: value
                    })}
                  >
                    <SelectTrigger id={`profile-${employee.id}`} className="w-full">
                      <SelectValue placeholder="Selecione um perfil" />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.name}
                          {profile.description && (
                            <span className="text-xs text-gray-500 ml-2">
                              - {profile.description}
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    O perfil define quais módulos e funcionalidades o colaborador poderá acessar
                  </p>
                </div>

                {/* Botões de Ação */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    onClick={() => handleApprove(employee)}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    disabled={approveAccessMutation.isPending || !selectedProfiles[employee.id]}
                  >
                    {approveAccessMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Aprovando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Aprovar Acesso
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => handleReject(employee)}
                    variant="outline"
                    className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                    disabled={rejectAccessMutation.isPending}
                  >
                    {rejectAccessMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Rejeitando...
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 mr-2" />
                        Rejeitar
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}