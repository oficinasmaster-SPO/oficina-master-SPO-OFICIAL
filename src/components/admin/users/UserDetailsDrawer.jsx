import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  User, Shield, Activity, History, Key, Copy, CheckCircle, XCircle,
  AlertCircle, Clock, Plus, Trash2 
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function UserDetailsDrawer({ 
  open, 
  onOpenChange, 
  user, 
  profile, 
  admin,
  onResetPassword,
  onApprove,
  isApproving,
  profiles 
}) {
  const [copiedField, setCopiedField] = useState(null);
  const [selectedProfileId, setSelectedProfileId] = useState(user?.profile_id || "");
  const [selectedTab, setSelectedTab] = useState("dados");
  const queryClient = useQueryClient();

  // Busca dados enriquecidos do usuário (employee + workshop)
  const { data: enrichedUserData } = useQuery({
    queryKey: ['user-details-enriched', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // Busca employee data
      let employeeData = null;
      try {
        const employees = await base44.entities.Employee.filter({ user_id: user.id });
        employeeData = Array.isArray(employees) ? employees[0] : null;
      } catch (error) {
        console.error('Erro ao buscar employee:', error);
      }
      
      // Busca workshop data
      let workshopData = null;
      const workshopId = employeeData?.workshop_id || user.workshop_id;
      if (workshopId) {
        try {
          const workshops = await base44.entities.Workshop.filter({ id: workshopId });
          workshopData = Array.isArray(workshops) ? workshops[0] : null;
        } catch (error) {
          console.error('Erro ao buscar workshop:', error);
        }
      }
      
      return {
        employee_data: employeeData || null,
        workshop_data: workshopData || null
      };
    },
    enabled: !!user?.id && open // Só busca quando drawer está aberto
  });

  // Busca exceções de permissão do usuário
  const { data: exceptions = [] } = useQuery({
    queryKey: ['user-permission-exceptions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await base44.functions.invoke('getUserPermissionExceptions', { user_id: user.id });
      return response.data.exceptions || [];
    },
    enabled: !!user?.id && selectedTab === 'permissoes-individuais'
  });

  // Merge dos dados enriquecidos com o user
  const userWithDetails = enrichedUserData 
    ? { ...user, ...enrichedUserData }
    : user;

  if (!userWithDetails) return null;

  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success(`${field} copiado!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: { label: "✅ Ativo", color: "bg-green-100 text-green-700" },
      pending: { label: "⏳ Aguardando Aprovação", color: "bg-yellow-100 text-yellow-700" },
      inactive: { label: "⏸️ Inativo", color: "bg-gray-100 text-gray-700" },
      blocked: { label: "🔒 Bloqueado", color: "bg-red-100 text-red-700" }
    };
    return badges[status] || badges.pending;
  };

  const statusBadge = getStatusBadge(userWithDetails.user_status);
  const diasSemLogin = userWithDetails.last_login_at 
    ? differenceInDays(new Date(), new Date(userWithDetails.last_login_at))
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xl font-bold">{userWithDetails.full_name}</p>
              <p className="text-sm text-gray-500 font-normal">{userWithDetails.position}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Banner de Aprovação */}
        {userWithDetails?.user_status === 'pending' && onApprove && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-yellow-800">
              <Clock className="w-5 h-5" />
              <span className="font-semibold">⏳ Aguardando Aprovação</span>
            </div>
            
            <p className="text-sm text-yellow-700">
              Este usuário completou o cadastro mas ainda não pode acessar o sistema. Selecione um perfil e aprove o acesso.
            </p>

            <div className="space-y-2">
              <Label htmlFor="approval-profile" className="text-xs text-yellow-800 font-medium">
                Selecione o Perfil de Acesso:
              </Label>
              <Select 
                value={selectedProfileId} 
                onValueChange={setSelectedProfileId}
              >
                <SelectTrigger id="approval-profile" className="bg-white">
                  <SelectValue placeholder="Escolha o perfil..." />
                </SelectTrigger>
                <SelectContent>
                  {profiles?.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={() => onApprove(selectedProfileId)}
              disabled={isApproving || !selectedProfileId}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {isApproving ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Aprovando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Aprovar e Liberar Acesso
                </>
              )}
            </Button>
          </div>
        )}

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dados">
              <User className="w-4 h-4 mr-2" />
              Dados
            </TabsTrigger>
            <TabsTrigger value="permissoes">
              <Shield className="w-4 h-4 mr-2" />
              Permissões
            </TabsTrigger>
            <TabsTrigger value="permissoes-individuais">
              <Plus className="w-4 h-4 mr-2" />
              Exceções
            </TabsTrigger>
            <TabsTrigger value="atividade">
              <Activity className="w-4 h-4 mr-2" />
              Atividade
            </TabsTrigger>
            <TabsTrigger value="auditoria">
              <History className="w-4 h-4 mr-2" />
              Auditoria
            </TabsTrigger>
          </TabsList>

          {/* ABA 1: DADOS GERAIS */}
          <TabsContent value="dados" className="flex-1 overflow-y-auto space-y-4">
            {/* Dados do Usuário */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                Dados da Conta
              </h4>
              <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Nome Completo</label>
                <p className="text-gray-900 mt-1">{userWithDetails.full_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Email (Login)</label>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-gray-900">{userWithDetails.email}</p>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={() => handleCopy(userWithDetails.email, 'Email')}
                  >
                    {copiedField === 'Email' ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Telefone</label>
                <p className="text-gray-900 mt-1">{userWithDetails.telefone || "Não informado"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Cargo</label>
                <p className="text-gray-900 mt-1">{userWithDetails.position}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Status</label>
                <div className="mt-1">
                  <Badge className={statusBadge.color}>{statusBadge.label}</Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Role</label>
                <Badge variant="outline" className="mt-1">{userWithDetails.role || "user"}</Badge>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Criado em</label>
                <p className="text-gray-900 mt-1">
                  {format(new Date(userWithDetails.created_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Admin Responsável</label>
                <p className="text-gray-900 mt-1">{admin?.full_name || admin?.email || "Não definido"}</p>
              </div>
              </div>
            </div>

            {/* Dados do Employee */}
            {userWithDetails.employee_data && (
              <div className="border rounded-lg p-4 bg-blue-50">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Dados do Colaborador
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Employee ID</label>
                    <p className="text-gray-900 mt-1 font-mono text-xs">{userWithDetails.employee_data.id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Cargo</label>
                    <p className="text-gray-900 mt-1">{userWithDetails.employee_data.position}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Job Role</label>
                    <Badge variant="outline" className="mt-1">{userWithDetails.employee_data.job_role}</Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Área</label>
                    <p className="text-gray-900 mt-1">{userWithDetails.employee_data.area || "Não definida"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Tipo</label>
                    <Badge className={userWithDetails.employee_data.user_type === 'internal' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}>
                      {userWithDetails.employee_data.user_type === 'internal' ? 'Interno' : 'Externo'}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Sócio</label>
                    <Badge className={userWithDetails.employee_data.is_partner ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                      {userWithDetails.employee_data.is_partner ? '✅ Sim' : '❌ Não'}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Contratação</label>
                    <p className="text-gray-900 mt-1">
                      {userWithDetails.employee_data.hire_date ? format(new Date(userWithDetails.employee_data.hire_date), "dd/MM/yyyy", { locale: ptBR }) : "Não informado"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Status</label>
                    <Badge className={userWithDetails.employee_data.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                      {userWithDetails.employee_data.status || 'ativo'}
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Dados da Oficina */}
            {userWithDetails.workshop_data && (
              <div className="border rounded-lg p-4 bg-green-50">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Oficina Vinculada
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-600">Nome da Oficina</label>
                    <p className="text-gray-900 mt-1 font-semibold">{userWithDetails.workshop_data.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Workshop ID</label>
                    <p className="text-gray-900 mt-1 font-mono text-xs">{userWithDetails.workshop_data.id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">CNPJ</label>
                    <p className="text-gray-900 mt-1">{userWithDetails.workshop_data.cnpj || "Não informado"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Cidade</label>
                    <p className="text-gray-900 mt-1">{userWithDetails.workshop_data.city} - {userWithDetails.workshop_data.state}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Segmento</label>
                    <p className="text-gray-900 mt-1">{userWithDetails.workshop_data.segment_auto || userWithDetails.workshop_data.segment || "Não definido"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Plano</label>
                    <Badge className="bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700">
                      {userWithDetails.workshop_data.planoAtual || userWithDetails.workshop_data.plan_type || "FREE"}
                    </Badge>
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-600">Proprietário</label>
                    <Badge className={userWithDetails.workshop_data.owner_id === userWithDetails.id ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                      {userWithDetails.workshop_data.owner_id === userWithDetails.id ? '✅ Este usuário é o proprietário' : 'Outro proprietário'}
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Perfil de Acesso */}
            <div className="border rounded-lg p-4 bg-purple-50">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Key className="w-4 h-4" />
                Perfil de Acesso (UserProfile)
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Profile ID</label>
                  <p className="text-gray-900 mt-1 font-mono text-xs">{profile?.id || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Nome do Perfil</label>
                  <Badge variant="outline" className="mt-1">{profile?.name || "Sem perfil"}</Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Tipo</label>
                  <Badge className={profile?.type === 'sistema' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}>
                    {profile?.type === 'sistema' ? 'Sistema (não editável)' : profile?.type || 'N/A'}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Permission Type</label>
                  <p className="text-gray-900 mt-1">{profile?.permission_type || "job_role"}</p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ABA 2: PERMISSÕES */}
          <TabsContent value="permissoes" className="flex-1 overflow-y-auto space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>Perfil:</strong> {profile?.name || "Sem perfil"}
              </p>
              <p className="text-xs text-blue-700 mt-1">
                As permissões abaixo são herdadas do perfil de acesso vinculado.
              </p>
            </div>

            {/* Módulos */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Permissões de Módulos</h4>
              <div className="grid grid-cols-2 gap-2">
                {profile?.module_permissions && Object.entries(profile.module_permissions).map(([module, level]) => (
                  <div key={module} className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm capitalize">{module.replace(/_/g, ' ')}</span>
                    <Badge className={
                      level === 'total' ? 'bg-green-100 text-green-700' :
                      level === 'visualizacao' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }>
                      {level === 'total' ? 'Total' : level === 'visualizacao' ? 'Visualização' : 'Bloqueado'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Sidebar */}
            {profile?.sidebar_permissions && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Permissões de Sidebar</h4>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {Object.entries(profile.sidebar_permissions).map(([item, perms]) => (
                    <div key={item} className="flex items-center justify-between p-2 border rounded text-sm">
                      <span>{item}</span>
                      <div className="flex gap-1">
                        {perms.view && <Badge className="bg-green-100 text-green-700 text-xs">Ver</Badge>}
                        {perms.edit && <Badge className="bg-blue-100 text-blue-700 text-xs">Editar</Badge>}
                        {perms.delete && <Badge className="bg-red-100 text-red-700 text-xs">Excluir</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ABA 3: PERMISSÕES INDIVIDUAIS (EXCEÇÕES) */}
          <TabsContent value="permissoes-individuais" className="flex-1 overflow-y-auto space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-900 font-semibold">⚠️ Permissões Individuais</p>
              <p className="text-xs text-amber-700 mt-1">
                Estas permissões são exceções que sobrescrevem o perfil de acesso. Use com cautela.
              </p>
            </div>

            {exceptions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Shield className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>Nenhuma permissão individual cadastrada.</p>
                <p className="text-sm">O usuário segue estritamente o perfil de acesso.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {exceptions.map((exception) => (
                  <div key={exception.id} className="border rounded-lg p-3 flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={
                          exception.permission_type === 'module_permission' ? 'bg-blue-100 text-blue-700' :
                          exception.permission_type === 'sidebar_permission' ? 'bg-purple-100 text-purple-700' :
                          'bg-gray-100 text-gray-700'
                        }>
                          {exception.permission_type === 'module_permission' ? 'Módulo' :
                           exception.permission_type === 'sidebar_permission' ? 'Sidebar' : 'Página'}
                        </Badge>
                        <Badge className={exception.granted ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                          {exception.granted ? 'Concede' : 'Nega'}
                        </Badge>
                        {exception.expires_at && (
                          <Badge variant="outline" className="text-xs">
                            Expira: {format(new Date(exception.expires_at), "dd/MM/yyyy", { locale: ptBR })}
                          </Badge>
                        )}
                      </div>
                      <p className="font-medium text-gray-900">{exception.permission_label || exception.permission_key}</p>
                      {exception.justification && (
                        <p className="text-xs text-gray-600 mt-1">
                          <strong>Justificativa:</strong> {exception.justification}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Criado por: {exception.created_by_name || exception.created_by} em {format(new Date(exception.created_at || exception.created_date), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-600 hover:text-red-700"
                      onClick={async () => {
                        if (window.confirm('Remover esta exceção?')) {
                          try {
                            await base44.functions.invoke('removeUserPermissionException', { exception_id: exception.id });
                            queryClient.invalidateQueries({ queryKey: ['user-permission-exceptions'] });
                            toast.success('Exceção removida');
                          } catch (error) {
                            toast.error('Erro ao remover: ' + error.message);
                          }
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ABA 3: ATIVIDADE */}
          <TabsContent value="atividade" className="flex-1 overflow-y-auto space-y-4">
            {!userWithDetails.first_login_at ? (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 text-center">
                <AlertCircle className="w-12 h-12 mx-auto text-orange-600 mb-3" />
                <h3 className="font-semibold text-orange-900 mb-2">Aguardando Primeiro Acesso</h3>
                <p className="text-sm text-orange-700 mb-4">
                  Este usuário ainda não realizou o primeiro login no sistema.
                </p>
                <Button 
                  onClick={() => onResetPassword(userWithDetails)}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Key className="w-4 h-4 mr-2" />
                  Gerar Nova Senha de Acesso
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-gray-600">Primeiro Acesso</span>
                    </div>
                    <p className="text-lg font-semibold text-gray-900">
                      {format(new Date(userWithDetails.first_login_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-gray-600">Último Login</span>
                    </div>
                    <p className="text-lg font-semibold text-gray-900">
                      {userWithDetails.last_login_at 
                        ? format(new Date(userWithDetails.last_login_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                        : "Nunca"
                      }
                    </p>
                  </div>
                </div>

                {diasSemLogin !== null && diasSemLogin > 30 && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-purple-900">Alerta de Inatividade</h4>
                        <p className="text-sm text-purple-700 mt-1">
                          Este usuário está sem realizar login há <strong>{diasSemLogin} dias</strong>.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <Button 
                    onClick={() => onResetPassword(userWithDetails)}
                    variant="outline"
                    className="w-full"
                  >
                    <Key className="w-4 h-4 mr-2" />
                    Resetar Senha
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ABA 4: AUDITORIA */}
          <TabsContent value="auditoria" className="flex-1 overflow-y-auto">
            {!userWithDetails.audit_log || userWithDetails.audit_log.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <History className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>Nenhuma alteração registrada ainda.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {userWithDetails.audit_log
                  .sort((a, b) => new Date(b.changed_at) - new Date(a.changed_at))
                  .map((log, idx) => (
                  <div key={idx} className="border-l-4 border-blue-500 pl-4 py-3 bg-gray-50 rounded-r">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{log.action}</p>
                        {log.field_changed && (
                          <p className="text-sm text-gray-600 mt-1">
                            <span className="font-medium">{log.field_changed}:</span>{' '}
                            <span className="text-red-600 line-through">{log.old_value || '(vazio)'}</span>
                            {' → '}
                            <span className="text-green-600">{log.new_value || '(vazio)'}</span>
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          <span>{format(new Date(log.changed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                          <span>•</span>
                          <span>{log.changed_by_email}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}