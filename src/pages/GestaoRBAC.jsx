import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Users, Eye, FileText, BarChart3, GitPullRequest, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ProfilesManagement from "@/components/rbac/ProfilesManagement";
import RolesManagement from "@/components/rbac/RolesManagement";
import UserPermissionsViewer from "@/components/rbac/UserPermissionsViewer";
import DocumentacaoRBAC from "@/pages/DocumentacaoRBAC";
import RBACAnalyticsDashboard from "@/components/rbac/analytics/RBACAnalyticsDashboard";
import PendingRequestsList from "@/components/rbac/PendingRequestsList";

export default function GestaoRBAC() {
  const [activeTab, setActiveTab] = useState("profiles");
  const [user, setUser] = useState(null);
  const [isInternal, setIsInternal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkInternalAccess = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        const employees = await base44.entities.Employee.filter({ user_id: currentUser.id });
        const employee = employees && employees.length > 0 ? employees[0] : null;
        
        const hasInternalAccess = currentUser.role === 'admin' || 
                                  currentUser.is_internal === true || 
                                  employee?.is_internal === true ||
                                  employee?.tipo_vinculo === 'interno';
        
        setIsInternal(hasInternalAccess);
      } catch (error) {
        console.error("Erro ao verificar acesso:", error);
        setIsInternal(false);
      } finally {
        setLoading(false);
      }
    };
    
    checkInternalAccess();
  }, []);

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['pending-requests-count'],
    queryFn: async () => {
      const requests = await base44.entities.PermissionChangeRequest.filter({ status: 'pendente' });
      return Array.isArray(requests) ? requests.length : 0;
    },
    refetchInterval: 30000
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isInternal) {
    return (
      <div className="max-w-2xl mx-auto mt-20">
        <Alert variant="destructive">
          <AlertCircle className="h-5 w-5" />
          <AlertDescription className="text-base">
            <strong>Acesso Restrito:</strong> Esta área é exclusiva para usuários internos da Oficinas Master.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestão RBAC</h1>
            <p className="text-gray-600 mt-1">
              Gerenciamento completo de perfis e permissões do sistema
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-5xl grid-cols-6">
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="approvals" className="gap-2 relative">
              <GitPullRequest className="w-4 h-4" />
              Aprovações
              {pendingCount > 0 && (
                <Badge className="ml-1 bg-orange-600 text-white h-5 min-w-5 px-1.5">
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="profiles" className="gap-2">
              <Users className="w-4 h-4" />
              Perfis
            </TabsTrigger>
            <TabsTrigger value="roles" className="gap-2">
              <Shield className="w-4 h-4" />
              Roles
            </TabsTrigger>
            <TabsTrigger value="user-permissions" className="gap-2">
              <Eye className="w-4 h-4" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="documentation" className="gap-2">
              <FileText className="w-4 h-4" />
              Docs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics">
            <RBACAnalyticsDashboard />
          </TabsContent>

          <TabsContent value="approvals">
            <PendingRequestsList />
          </TabsContent>

          <TabsContent value="profiles">
            <ProfilesManagement />
          </TabsContent>

          <TabsContent value="roles">
            <RolesManagement />
          </TabsContent>

          <TabsContent value="user-permissions">
            <UserPermissionsViewer />
          </TabsContent>

          <TabsContent value="documentation">
            <DocumentacaoRBAC />
          </TabsContent>
        </Tabs>
      </div>
  );
}