import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { addDays, format } from "date-fns";

export default function PeriodFilter({ onPeriodChange, defaultPeriod = "30" }) {
  const [period, setPeriod] = useState(defaultPeriod);
  const [customStart, setCustomStart] = useState(null);
  const [customEnd, setCustomEnd] = useState(null);

  const handlePeriodChange = (value) => {
    setPeriod(value);
    const today = new Date();
    let endDate;

    if (value === "30") endDate = addDays(today, 30);
    else if (value === "60") endDate = addDays(today, 60);
    else if (value === "90") endDate = addDays(today, 90);
    else if (value === "120") endDate = addDays(today, 120);

    if (value !== "custom") {
      onPeriodChange({
        startDate: format(today, "yyyy-MM-dd"),
        endDate: format(endDate, "yyyy-MM-dd")
      });
      setCustomStart(null);
      setCustomEnd(null);
    }
  };

  const handleCustomApply = () => {
    if (customStart && customEnd) {
      onPeriodChange({
        startDate: format(new Date(customStart), "yyyy-MM-dd"),
        endDate: format(new Date(customEnd), "yyyy-MM-dd")
      });
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-gray-700">Período:</span>
      <Select value={period} onValueChange={handlePeriodChange}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="30">Próximos 30 dias</SelectItem>
          <SelectItem value="60">Próximos 60 dias</SelectItem>
          <SelectItem value="90">Próximos 90 dias</SelectItem>
          <SelectItem value="120">Próximos 120 dias</SelectItem>
          <SelectItem value="custom">Personalizado</SelectItem>
        </SelectContent>
      </Select>

      {period === "custom" && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Calendar className="w-4 h-4" />
              {customStart && customEnd ? format(new Date(customStart), "dd/MM") + " - " + format(new Date(customEnd), "dd/MM") : "Selecionar"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72">
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-700">Data Inicial</label>
                <input
                  type="date"
                  value={customStart || ""}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700">Data Final</label>
                <input
                  type="date"
                  value={customEnd || ""}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <Button size="sm" className="w-full" onClick={handleCustomApply}>
                Aplicar
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}