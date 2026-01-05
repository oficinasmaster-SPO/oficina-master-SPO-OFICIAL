import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, User } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import DISCQuestions from "@/components/disc/DISCQuestions";

export default function AutoavaliacaoDISC() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [employee, setEmployee] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const employees = await base44.entities.Employee.filter({ user_id: currentUser.id });
      if (employees && employees.length > 0) {
        setEmployee(employees[0]);
      } else {
        toast.error("Perfil de colaborador não encontrado");
        navigate(createPageUrl("MeuPerfil"));
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (answers, profileScores, dominantProfile) => {
    try {
      const diagnostic = await base44.entities.DISCDiagnostic.create({
        employee_id: employee.id,
        evaluator_id: user.id,
        workshop_id: employee.workshop_id,
        evaluation_type: 'self',
        answers,
        profile_scores: profileScores,
        dominant_profile: dominantProfile,
        completed: true
      });

      toast.success("Autoavaliação DISC concluída!");
      navigate(createPageUrl("ResultadoDISC") + `?id=${diagnostic.id}`);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar: " + error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <Card className="shadow-2xl border-2 border-purple-200 mb-6">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
            <CardTitle className="flex items-center gap-2">
              <User className="w-6 h-6" />
              Autoavaliação DISC - {employee?.full_name}
            </CardTitle>
            <p className="text-purple-100 text-sm mt-1">
              Identifique seu perfil comportamental
            </p>
          </CardHeader>
        </Card>

        <DISCQuestions onComplete={handleComplete} />
      </div>
    </div>
  );
}