import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Edit, Users } from "lucide-react";

export default function RoleCard({ role, employeeCount, onClick }) {
  const getRoleColor = (roleId) => {
    const colors = {
      diretor: "from-purple-500 to-indigo-600",
      gerente: "from-blue-500 to-cyan-600",
      supervisor_loja: "from-green-500 to-emerald-600",
      tecnico: "from-orange-500 to-red-600",
      comercial: "from-pink-500 to-rose-600",
      outros: "from-gray-500 to-slate-600"
    };
    return colors[roleId] || "from-gray-400 to-gray-600";
  };

  return (
    <Card className="hover:shadow-lg transition-all cursor-pointer group" onClick={onClick}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${getRoleColor(role.id)} flex items-center justify-center group-hover:scale-110 transition-transform`}>
            <Shield className="w-6 h-6 text-white" />
          </div>
          <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
            <Edit className="w-4 h-4" />
          </Button>
        </div>
        <CardTitle className="mt-4">{role.label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Users className="w-4 h-4" />
          <span>{employeeCount} colaborador{employeeCount !== 1 ? 'es' : ''}</span>
        </div>
        <Badge className="mt-3" variant="outline">
          {role.id}
        </Badge>
      </CardContent>
    </Card>
  );
}