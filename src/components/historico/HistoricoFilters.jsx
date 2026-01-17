import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Building2, User, Eye, EyeOff } from "lucide-react";

export default function HistoricoFilters({
  filterType,
  setFilterType,
  filterEmployee,
  setFilterEmployee,
  filterMonth,
  setFilterMonth,
  showAllRecords,
  setShowAllRecords,
  employees
}) {
  return (
    <Card className="mb-6 shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg">Filtros</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Filtrar por</Label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="workshop">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Oficina (Geral)
                  </div>
                </SelectItem>
                <SelectItem value="employee">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Colaborador
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filterType === "employee" && (
            <div>
              <Label>Colaborador</Label>
              <Select value={filterEmployee} onValueChange={setFilterEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os colaboradores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Todos</SelectItem>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name} - {emp.position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="mt-4">
          <Label>Filtrar por Mês</Label>
          <Input
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="max-w-xs"
          />
        </div>

        <div className="mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAllRecords(!showAllRecords)}
            className="w-full"
          >
            {showAllRecords ? (
              <>
                <EyeOff className="w-4 h-4 mr-2" />
                Ocultar registros sem faturamento
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-2" />
                Mostrar todos os registros (incluindo sem faturamento)
              </>
            )}
          </Button>
          <p className="text-xs text-gray-500 mt-1">
            {showAllRecords 
              ? "Mostrando todos os registros, inclusive dias sem faturamento (para editar dados de marketing, agendamentos, etc.)" 
              : "Mostrando apenas dias com faturamento registrado"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}