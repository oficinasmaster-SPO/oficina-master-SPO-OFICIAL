import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function CompletarPerfil() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [employee, setEmployee] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [formData, setFormData] = useState({
    cpf: "",
    telefone: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      if (!user) {
        navigate(createPageUrl("Home"));
        return;
      }

      const employees = await base44.entities.Employee.filter({ user_id: user.id });
      if (employees && employees.length > 0) {
        setEmployee(employees[0]);
        setFormData({
          cpf: employees[0].cpf || "",
          telefone: employees[0].telefone || "",
        });
        
        if (employees[0].workshop_id) {
          const ws = await base44.entities.Workshop.get(employees[0].workshop_id);
          setWorkshop(ws);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  };

  const formatCPF = (value) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const formatPhone = (value) => {
    const v = value.replace(/\D/g, '');
    if (v.length <= 10) {
      return v.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return v.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const handleSave = async () => {
    if (!formData.cpf || formData.cpf.replace(/\D/g, '').length !== 11) {
      toast.error("Por favor, informe um CPF válido.");
      return;
    }
    if (!formData.telefone || formData.telefone.replace(/\D/g, '').length < 10) {
      toast.error("Por favor, informe um telefone válido.");
      return;
    }

    setSaving(true);
    try {
      if (employee) {
        await base44.entities.Employee.update(employee.id, {
          cpf: formData.cpf,
          telefone: formData.telefone
        });
      }

      // Atualiza o perfil do usuário para completed
      await base44.auth.updateMe({
        profile_completed: true
      });

      toast.success(`Bem-vindo! ${workshop ? workshop.name : ''}`);
      setTimeout(() => {
        window.location.href = createPageUrl("Home");
      }, 1500);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar os dados.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-blue-600">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl text-blue-900">Complete seu Perfil</CardTitle>
          <CardDescription>
            Falta pouco! Preencha os dados abaixo para acessar o sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>CPF *</Label>
            <Input
              value={formData.cpf}
              onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
              placeholder="000.000.000-00"
              maxLength={14}
            />
          </div>
          <div className="space-y-2">
            <Label>Telefone / WhatsApp *</Label>
            <Input
              value={formData.telefone}
              onChange={(e) => setFormData({ ...formData, telefone: formatPhone(e.target.value) })}
              placeholder="(00) 00000-0000"
              maxLength={15}
            />
          </div>
          <Button 
            className="w-full mt-4" 
            onClick={handleSave} 
            disabled={saving}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {saving ? "Salvando..." : "Salvar e Continuar"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}