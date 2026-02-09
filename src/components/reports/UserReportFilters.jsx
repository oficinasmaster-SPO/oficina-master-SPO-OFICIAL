import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "lucide-react";

export default function UserReportFilters({ filters, onFiltersChange }) {
  const handleDateChange = (field, value) => {
    onFiltersChange({
      ...filters,
      [field]: value
    });
  };

  const presetRanges = [
    { label: '7 dias', days: 7 },
    { label: '30 dias', days: 30 },
    { label: '90 dias', days: 90 },
    { label: '1 ano', days: 365 }
  ];

  const applyPreset = (days) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    onFiltersChange({
      ...filters,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-sm">Data Inicial</Label>
            <Input
              type="date"
              value={filters.startDate.split('T')[0]}
              onChange={(e) => handleDateChange('startDate', new Date(e.target.value).toISOString())}
              className="mt-1"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <Label className="text-sm">Data Final</Label>
            <Input
              type="date"
              value={filters.endDate.split('T')[0]}
              onChange={(e) => handleDateChange('endDate', new Date(e.target.value).toISOString())}
              className="mt-1"
            />
          </div>
          <div className="flex gap-2">
            {presetRanges.map((preset, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                onClick={() => applyPreset(preset.days)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}