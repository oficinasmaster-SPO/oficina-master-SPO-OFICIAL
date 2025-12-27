import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Users, Activity, TrendingUp, AlertCircle, Flame } from "lucide-react";
import ProfileUsageStats from "./ProfileUsageStats";
import PermissionDistribution from "./PermissionDistribution";
import RBACLogStats from "../audit/RBACLogStats";
import PermissionTrendsChart from "./PermissionTrendsChart";
import UnusedPermissions from "./UnusedPermissions";
import ProfileComplexityAnalysis from "./ProfileComplexityAnalysis";
import PermissionUsageHeatmap from "./PermissionUsageHeatmap";
import PermissionChangeTimeline from "./PermissionChangeTimeline";

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
      const result = await base44.entities.RBACLog.list('-created_date', 1000);
      return Array.isArray(result) ? result : [];
    }
  });

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-6">
        <TabsTrigger value="overview" className="gap-2">
          <BarChart3 className="w-4 h-4" />
          Visão Geral
        </TabsTrigger>
        <TabsTrigger value="trends" className="gap-2">
          <TrendingUp className="w-4 h-4" />
          Tendências
        </TabsTrigger>
        <TabsTrigger value="usage" className="gap-2">
          <Users className="w-4 h-4" />
          Uso
        </TabsTrigger>
        <TabsTrigger value="heatmap" className="gap-2">
          <Flame className="w-4 h-4" />
          Mapa Calor
        </TabsTrigger>
        <TabsTrigger value="complexity" className="gap-2">
          <AlertCircle className="w-4 h-4" />
          Complexidade
        </TabsTrigger>
        <TabsTrigger value="activity" className="gap-2">
          <Activity className="w-4 h-4" />
          Atividade
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-6">
        <div className="space-y-6">
          <ProfileUsageStats profiles={profiles} employees={employees} />
          <PermissionDistribution profiles={profiles} customRoles={customRoles} />
        </div>
      </TabsContent>

      <TabsContent value="trends" className="mt-6">
        <div className="space-y-6">
          <PermissionTrendsChart logs={logs} />
          <PermissionChangeTimeline logs={logs} />
        </div>
      </TabsContent>

      <TabsContent value="usage" className="mt-6">
        <UnusedPermissions profiles={profiles} />
      </TabsContent>

      <TabsContent value="heatmap" className="mt-6">
        <PermissionUsageHeatmap profiles={profiles} />
      </TabsContent>

      <TabsContent value="complexity" className="mt-6">
        <ProfileComplexityAnalysis profiles={profiles} />
      </TabsContent>

      <TabsContent value="activity" className="mt-6">
        <RBACLogStats logs={logs} />
      </TabsContent>
    </Tabs>
  );
}