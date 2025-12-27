import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, PieChart, Users, Activity } from "lucide-react";
import ProfileUsageStats from "./ProfileUsageStats";
import PermissionDistribution from "./PermissionDistribution";
import RBACLogStats from "../audit/RBACLogStats";

export default function RBACAnalyticsDashboard() {
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-analytics'],
    queryFn: async () => {
      const result = await base44.entities.UserProfile.list();
      return Array.isArray(result) ? result : [];
    }
  });

  const { data: customRoles = [] } = useQuery({
    queryKey: ['roles-analytics'],
    queryFn: async () => {
      const result = await base44.entities.CustomRole.list();
      return Array.isArray(result) ? result : [];
    }
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-analytics'],
    queryFn: async () => {
      const result = await base44.entities.Employee.list();
      return Array.isArray(result) ? result : [];
    }
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['rbac-logs-analytics'],
    queryFn: async () => {
      const result = await base44.entities.RBACLog.list('-created_date', 500);
      return Array.isArray(result) ? result : [];
    }
  });

  return (
    <Tabs defaultValue="usage" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="usage" className="gap-2">
          <Users className="w-4 h-4" />
          Uso de Perfis
        </TabsTrigger>
        <TabsTrigger value="distribution" className="gap-2">
          <BarChart3 className="w-4 h-4" />
          Distribuição
        </TabsTrigger>
        <TabsTrigger value="activity" className="gap-2">
          <Activity className="w-4 h-4" />
          Atividade
        </TabsTrigger>
      </TabsList>

      <TabsContent value="usage" className="mt-6">
        <ProfileUsageStats profiles={profiles} employees={employees} />
      </TabsContent>

      <TabsContent value="distribution" className="mt-6">
        <PermissionDistribution profiles={profiles} customRoles={customRoles} />
      </TabsContent>

      <TabsContent value="activity" className="mt-6">
        <RBACLogStats logs={logs} />
      </TabsContent>
    </Tabs>
  );
}