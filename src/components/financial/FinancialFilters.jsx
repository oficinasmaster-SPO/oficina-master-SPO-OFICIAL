import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";

export default function FinancialFilters({ dateRange, onDateRangeChange }) {
  const [localRange, setLocalRange] = React.useState(dateRange);

  const handleApply = () => {
    onDateRangeChange(localRange);
  };

  const setPreset = (preset) => {
    const today = new Date();
    let startDate, endDate;

    switch (preset) {
      case "thisMonth":
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = today;
        break;
      case "lastMonth":
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case "thisYear":
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = today;
        break;
    }

    const range = {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
    setLocalRange(range);
    onDateRangeChange(range);
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <Label htmlFor="startDate">Data Início</Label>
            <Input
              id="startDate"
              type="date"
              value={localRange.startDate}
              onChange={(e) => setLocalRange({ ...localRange, startDate: e.target.value })}
              className="mt-1"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <Label htmlFor="endDate">Data Fim</Label>
            <Input
              id="endDate"
              type="date"
              value={localRange.endDate}
              onChange={(e) => setLocalRange({ ...localRange, endDate: e.target.value })}
              className="mt-1"
            />
          </div>
          <Button onClick={handleApply}>
            <Calendar className="w-4 h-4 mr-2" />
            Aplicar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPreset("thisMonth")}>
              Este Mês
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPreset("lastMonth")}>
              Mês Passado
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPreset("thisYear")}>
              Este Ano
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}