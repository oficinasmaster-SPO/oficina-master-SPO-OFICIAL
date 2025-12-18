import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  User, Shield, Activity, History, Key, Copy, CheckCircle, XCircle,
  AlertCircle, Clock 
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export default function UserDetailsDrawer({ 
  open, 
  onClose, 
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

  if (!user) return null;

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

  const statusBadge = getStatusBadge(user.user_status);
  const diasSemLogin = user.last_login_at 
    ? differenceInDays(new Date(), new Date(user.last_login_at))
    : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xl font-bold">{user.full_name}</p>
              <p className="text-sm text-gray-500 font-normal">{user.position}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Banner de Aprovação */}
        {user?.user_status === 'pending' && onApprove && (
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

        <Tabs defaultValue="dados" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dados">
              <User className="w-4 h-4 mr-2" />
              Dados
            </TabsTrigger>
            <TabsTrigger value="permissoes">
              <Shield className="w-4 h-4 mr-2" />
              Permissões
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Nome Completo</label>
                <p className="text-gray-900 mt-1">{user.full_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Email (Login)</label>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-gray-900">{user.email}</p>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={() => handleCopy(user.email, 'Email')}
                  >
                    {copiedField === 'Email' ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Telefone</label>
                <p className="text-gray-900 mt-1">{user.telefone || "Não informado"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Cargo</label>
                <p className="text-gray-900 mt-1">{user.position}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Perfil de Acesso</label>
                <Badge variant="outline" className="mt-1">{profile?.name || "Sem perfil"}</Badge>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Admin Responsável</label>
                <p className="text-gray-900 mt-1">{admin?.full_name || admin?.email || "Não definido"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Status</label>
                <div className="mt-1">
                  <Badge className={statusBadge.color}>{statusBadge.label}</Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Criado em</label>
                <p className="text-gray-900 mt-1">
                  {format(new Date(user.created_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </p>
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

          {/* ABA 3: ATIVIDADE */}
          <TabsContent value="atividade" className="flex-1 overflow-y-auto space-y-4">
            {!user.first_login_at ? (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 text-center">
                <AlertCircle className="w-12 h-12 mx-auto text-orange-600 mb-3" />
                <h3 className="font-semibold text-orange-900 mb-2">Aguardando Primeiro Acesso</h3>
                <p className="text-sm text-orange-700 mb-4">
                  Este usuário ainda não realizou o primeiro login no sistema.
                </p>
                <Button 
                  onClick={() => onResetPassword(user)}
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
                      {format(new Date(user.first_login_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-gray-600">Último Login</span>
                    </div>
                    <p className="text-lg font-semibold text-gray-900">
                      {user.last_login_at 
                        ? format(new Date(user.last_login_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
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
                    onClick={() => onResetPassword(user)}
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
            {!user.audit_log || user.audit_log.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <History className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>Nenhuma alteração registrada ainda.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {user.audit_log
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