import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Brain } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

import PerformanceForecast from "../components/ai-analytics/PerformanceForecast";
import BottleneckDetector from "../components/ai-analytics/BottleneckDetector";
import ServiceRecommender from "../components/ai-analytics/ServiceRecommender";

export default function IAAnalytics() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      try {
        const workshops = await base44.entities.Workshop.list();
        let loadedWorkshop = workshops.find(w => w.owner_id === currentUser.id);
        
        if (!loadedWorkshop) {
             // Fallback for employees
             const employees = await base44.entities.Employee.filter({ email: currentUser.email });
             if (employees.length > 0 && employees[0].workshop_id) {
                 loadedWorkshop = workshops.find(w => w.id === employees[0].workshop_id);
             }
        }
        
        if (loadedWorkshop) {
            setWorkshop(loadedWorkshop);
        }
      } catch (workshopError) {
        console.log("Error fetching workshops:", workshopError);
      }
    } catch (error) {
      console.log("Error loading user:", error);
      navigate(createPageUrl("Home"));
    } finally {
      setLoading(false);
    }
  };

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', workshop?.id],
    queryFn: async () => {
      if (!workshop) return [];
      try {
        const result = await base44.entities.Employee.filter({ workshop_id: workshop.id });
        return Array.isArray(result) ? result : [];
      } catch (error) {
        return [];
      }
    },
    enabled: !!workshop,
    retry: 1
  });

  const { data: osAssessments = [] } = useQuery({
    queryKey: ['os-assessments', workshop?.id],
    queryFn: async () => {
      if (!workshop) return [];
      try {
        const result = await base44.entities.ServiceOrderDiagnostic.filter({ workshop_id: workshop.id });
        return Array.isArray(result) ? result : [];
      } catch (error) {
        return [];
      }
    },
    enabled: !!workshop,
    retry: 1
  });

  if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      );
  }

  if (!workshop) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 py-8 px-4 flex items-center justify-center">
         <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Nenhuma Oficina Encontrada</h1>
            <p className="text-gray-600 mb-4">Você precisa ter uma oficina cadastrada para usar o IA Analytics.</p>
            <Button onClick={() => navigate(createPageUrl("Cadastro"))}>
                Cadastrar Oficina
            </Button>
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Brain className="w-10 h-10 text-purple-600" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              IA Analytics
            </h1>
          </div>
          <p className="text-lg text-gray-600">
            Análises preditivas e recomendações inteligentes
          </p>
        </div>

        {/* Módulos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PerformanceForecast workshop={workshop} />
          <ServiceRecommender workshop={workshop} />
          <div className="lg:col-span-2">
            <BottleneckDetector 
              workshop={workshop}
              employees={employees}
              osAssessments={osAssessments}
            />
          </div>
        </div>
      </div>
    </div>
  );
}