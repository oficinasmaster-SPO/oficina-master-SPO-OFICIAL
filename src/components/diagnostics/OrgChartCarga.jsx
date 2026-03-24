import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Users, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';

export default function OrgChartCarga({ employees, diagnosticData }) {
  const workloadMap = {};
  if (diagnosticData?.workload_data) {
    diagnosticData.workload_data.forEach(d => {
      workloadMap[d.employee_id] = d;
    });
  }

  const managers = employees.filter(e => !e.admin_responsavel_id || e.admin_responsavel_id === e.id || e.position?.toLowerCase().includes("gerente") || e.position?.toLowerCase().includes("diretor") || e.job_role === 'socio');
  const subordinates = employees.filter(e => !managers.find(m => m.id === e.id));

  const getSaturationInfo = (saturation) => {
    if (saturation > 110) return { bg: 'bg-red-50 border-red-200 text-red-900', icon: <AlertTriangle className="w-4 h-4 text-red-500" /> };
    if (saturation < 80) return { bg: 'bg-blue-50 border-blue-200 text-blue-900', icon: <TrendingUp className="w-4 h-4 text-blue-500" /> };
    return { bg: 'bg-green-50 border-green-200 text-green-900', icon: <CheckCircle className="w-4 h-4 text-green-500" /> };
  };

  const renderNode = (employee) => {
    const wd = workloadMap[employee.id];
    const saturation = wd && wd.ideal_weekly_hours > 0 ? (wd.weekly_hours_worked / wd.ideal_weekly_hours) * 100 : 0;
    const info = getSaturationInfo(saturation);
    
    return (
      <div key={employee.id} className={`p-4 rounded-xl border-2 shadow-sm min-w-[220px] max-w-[250px] text-center transition-all hover:shadow-md relative ${info.bg}`}>
        <div className="absolute top-2 right-2">
           {info.icon}
        </div>
        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mx-auto mb-3 shadow-sm border border-gray-100">
           <Users className="w-6 h-6 text-gray-400" />
        </div>
        <div className="font-bold truncate" title={employee.full_name}>{employee.full_name}</div>
        <div className="text-xs opacity-80 mb-3 truncate">{employee.position || 'Sem cargo'}</div>
        
        <div className="bg-white/60 rounded-lg p-2 flex justify-between items-center mt-2">
            <span className="text-xs font-semibold">Saturação:</span>
            <span className="text-base font-black">{saturation.toFixed(0)}%</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 overflow-x-auto p-8 bg-slate-50 rounded-xl min-h-[400px]">
      <div className="flex flex-col items-center gap-12 min-w-max">
        {managers.length > 0 ? managers.map(m => (
          <div key={m.id} className="flex flex-col items-center">
            {renderNode(m)}
            {subordinates.length > 0 && (
              <>
                <div className="w-0.5 h-10 bg-gray-300"></div>
                <div className="relative">
                  <div className="absolute top-0 left-[10%] right-[10%] h-0.5 bg-gray-300"></div>
                  <div className="flex gap-6 pt-10">
                    {subordinates.map(s => (
                       <div key={s.id} className="relative flex flex-col items-center">
                         <div className="absolute top-[-40px] w-0.5 h-10 bg-gray-300"></div>
                         {renderNode(s)}
                       </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )) : (
          <div className="flex flex-wrap gap-6 justify-center">
            {employees.map(renderNode)}
          </div>
        )}
      </div>
    </div>
  );
}