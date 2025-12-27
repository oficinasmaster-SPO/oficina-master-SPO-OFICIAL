import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, PlusCircle } from "lucide-react";
import CustomRoleManager from "@/components/rbac/CustomRoleManager";
import UserProfileManager from "@/components/rbac/UserProfileManager";
import PendingRequestsList from "@/components/rbac/PendingRequestsList";
import ProfileTemplateManager from "@/components/rbac/templates/ProfileTemplateManager";
import RoleTemplateManager from "@/components/rbac/templates/RoleTemplateManager";
import TemplateFormDialog from "@/components/rbac/templates/TemplateFormDialog";
import AuditStats from "@/components/rbac/audit/AuditStats";
import AuditFilters from "@/components/rbac/audit/AuditFilters";
import AuditLogTable from "@/components/rbac/audit/AuditLogTable";
import AuditDetailsDialog from "@/components/rbac/audit/AuditDetailsDialog";
import HomeWidgetsManager from "@/components/rbac/HomeWidgetsManager";
import PermissionChangeManager from "@/components/rbac/PermissionChangeManager";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function GestaoPerfis() {
  const [activeTab, setActiveTab] = useState("profiles");
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [auditFilters, setAuditFilters] = useState({
    searchTerm: '',
    actionType: 'all',
    dateFrom: '',
    dateTo: ''
  });
  const [selectedAuditLog, setSelectedAuditLog] = useState(null);
  const [auditDetailsOpen, setAuditDetailsOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: pendingRequests = [] } = useQuery({
    queryKey: ['permissionRequests'],
    queryFn: () => base44.entities.PermissionChangeRequest.list(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-audit'],
    queryFn: () => base44.entities.Employee.list(),
  });

  const allAuditLogs = React.useMemo(() => {
    const logs = [];
    employees.forEach(emp => {
      if (emp.audit_log && Array.isArray(emp.audit_log)) {
        emp.audit_log.forEach(log => {
          logs.push({
            ...log,
            employee_id: emp.id,
            employee_name: emp.full_name
          });
        });
      }
    });
    return logs.sort((a, b) => {
      const dateA = new Date(a.changed_at || 0);
      const dateB = new Date(b.changed_at || 0);
      return dateB - dateA;
    });
  }, [employees]);

  const filteredAuditLogs = React.useMemo(() => {
    return allAuditLogs.filter(log => {
      const matchesSearch = !auditFilters.searchTerm || 
        log.employee_name?.toLowerCase().includes(auditFilters.searchTerm.toLowerCase()) ||
        log.changed_by?.toLowerCase().includes(auditFilters.searchTerm.toLowerCase());

      const matchesAction = auditFilters.actionType === 'all' || log.action === auditFilters.actionType;

      const logDate = new Date(log.changed_at);
      const matchesDateFrom = !auditFilters.dateFrom || logDate >= new Date(auditFilters.dateFrom);
      const matchesDateTo = !auditFilters.dateTo || logDate <= new Date(auditFilters.dateTo + 'T23:59:59');

      return matchesSearch && matchesAction && matchesDateFrom && matchesDateTo;
    });
  }, [allAuditLogs, auditFilters]);

  const pendingCount = pendingRequests.filter(r => r.status === 'pendente').length;

  const saveTemplateMutation = useMutation({
    mutationFn: async (data) => {
      const entity = activeTab === 'profile-templates' ? 'ProfileTemplate' : 'RoleTemplate';
      if (editingTemplate) {
        return await base44.entities[entity].update(editingTemplate.id, data);
      }
      return await base44.entities[entity].create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['profileTemplates']);
      queryClient.invalidateQueries(['roleTemplates']);
      toast.success('Template salvo com sucesso!');
      setTemplateDialogOpen(false);
      setEditingTemplate(null);
    },
    onError: (err) => toast.error('Erro ao salvar template: ' + err.message)
  });

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setTemplateDialogOpen(true);
  };

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Gestão de Perfis e Roles</h1>
        <p className="text-gray-600 mt-2">
          Configure perfis de usuário e roles customizadas com permissões granulares
        </p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-8 gap-1">
          <TabsTrigger value="profiles">Perfis de Usuário</TabsTrigger>
          <TabsTrigger value="roles">Roles Customizadas</TabsTrigger>
          <TabsTrigger value="profile-templates">
            <Sparkles className="w-3 h-3 mr-1" />
            Templates Perfis
          </TabsTrigger>
          <TabsTrigger value="role-templates">
            <Sparkles className="w-3 h-3 mr-1" />
            Templates Roles
          </TabsTrigger>
          <TabsTrigger value="home-widgets">
            Widgets Home
          </TabsTrigger>
          <TabsTrigger value="requests" className="relative">
            Mudanças
            {pendingCount > 0 && (
              <Badge className="ml-2 bg-red-500 text-white">{pendingCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pending" className="relative">
            Solicitações
            {pendingCount > 0 && (
              <Badge className="ml-2 bg-red-500 text-white">{pendingCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="audit">
            Auditoria
          </TabsTrigger>
        </TabsList>
        <TabsContent value="profiles" className="mt-6">
          <UserProfileManager />
        </TabsContent>
        <TabsContent value="roles" className="mt-6">
          <CustomRoleManager />
        </TabsContent>
        <TabsContent value="profile-templates" className="mt-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-800">Templates de Perfis</h2>
              <p className="text-sm text-gray-600 mt-1">Crie templates reutilizáveis para acelerar a criação de perfis</p>
            </div>
            <Button onClick={handleCreateTemplate}>
              <PlusCircle className="w-4 h-4 mr-2" />
              Novo Template
            </Button>
          </div>
          <ProfileTemplateManager onEdit={handleEditTemplate} />
        </TabsContent>
        <TabsContent value="role-templates" className="mt-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-800">Templates de Roles</h2>
              <p className="text-sm text-gray-600 mt-1">Crie templates reutilizáveis para acelerar a criação de roles</p>
            </div>
            <Button onClick={handleCreateTemplate}>
              <PlusCircle className="w-4 h-4 mr-2" />
              Novo Template
            </Button>
          </div>
          <RoleTemplateManager onEdit={handleEditTemplate} />
        </TabsContent>
        <TabsContent value="home-widgets" className="mt-6">
          <HomeWidgetsManager />
        </TabsContent>
        <TabsContent value="requests" className="mt-6">
          <PermissionChangeManager />
        </TabsContent>
        <TabsContent value="pending" className="mt-6">
          <PendingRequestsList />
        </TabsContent>
        <TabsContent value="audit" className="mt-6">
          <div className="space-y-6">
            <AuditStats logs={filteredAuditLogs} />
            <AuditFilters 
              filters={auditFilters}
              onFiltersChange={setAuditFilters}
              onClearFilters={() => setAuditFilters({
                searchTerm: '',
                actionType: 'all',
                dateFrom: '',
                dateTo: ''
              })}
            />
            <div className="bg-white rounded-lg border p-4">
              <h2 className="text-lg font-semibold mb-4">
                Logs de Auditoria ({filteredAuditLogs.length})
              </h2>
              <AuditLogTable 
                logs={filteredAuditLogs}
                onViewDetails={(log) => {
                  setSelectedAuditLog(log);
                  setAuditDetailsOpen(true);
                }}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <AuditDetailsDialog
        open={auditDetailsOpen}
        onClose={() => setAuditDetailsOpen(false)}
        log={selectedAuditLog}
      />

      <TemplateFormDialog
        open={templateDialogOpen}
        onClose={() => {
          setTemplateDialogOpen(false);
          setEditingTemplate(null);
        }}
        template={editingTemplate}
        type={activeTab === 'profile-templates' ? 'profile' : 'role'}
        onSubmit={(data) => saveTemplateMutation.mutate(data)}
        isLoading={saveTemplateMutation.isPending}
      />
    </div>
  );
}