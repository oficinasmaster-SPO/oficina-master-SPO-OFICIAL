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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const workshops = await base44.entities.Workshop.list();
      const userWorkshop = workshops.find(w => w.owner_id === currentUser.id);
      
      if (!userWorkshop) {
        navigate(createPageUrl("Cadastro"));
        return;
      }

      setWorkshop(userWorkshop);
    } catch (error) {
      navigate(createPageUrl("Home"));
    }
  };

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    enabled: !!workshop
  });

  const { data: osAssessments = [] } = useQuery({
    queryKey: ['os-assessments'],
    queryFn: () => base44.entities.ServiceOrderDiagnostic.list(),
    enabled: !!workshop
  });

  if (!workshop) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
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