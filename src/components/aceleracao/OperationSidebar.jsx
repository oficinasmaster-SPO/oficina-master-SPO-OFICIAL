import React, { memo } from "react";
import { Brain, TrendingUp, AlertTriangle, Calendar, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const InteligenciaWidget = memo(() => (
  <Card className="border-gray-200 shadow-sm">
    <CardContent className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Brain className="w-4 h-4 text-indigo-500" />
        <h3 className="text-sm font-bold text-gray-700">Inteligência de Operação</h3>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-emerald-50 p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-emerald-600">
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="text-[10px] font-semibold uppercase">Realização</span>
          </div>
          <p className="text-xl font-bold text-emerald-700 mt-1">68%</p>
        </div>

        <div className="rounded-lg bg-red-50 p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-red-600">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="text-[10px] font-semibold uppercase">Críticos</span>
          </div>
          <p className="text-xl font-bold text-red-700 mt-1">7</p>
        </div>
      </div>

      <div className="space-y-1.5 pt-1">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Workshops sem follow-up</span>
          <span className="font-semibold text-gray-700">12</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Sem contato &gt; 7 dias</span>
          <span className="font-semibold text-amber-600">5</span>
        </div>
      </div>
    </CardContent>
  </Card>
));
InteligenciaWidget.displayName = "InteligenciaWidget";

const PROXIMAS_PISTAS = [
  { id: 1, time: "09:00", client: "Auto Center Silva", consultant: "João P." },
  { id: 2, time: "11:30", client: "Oficina do Carlos", consultant: "Maria S." },
  { id: 3, time: "14:00", client: "Mecânica Veloz", consultant: "Pedro A." },
  { id: 4, time: "16:00", client: "Auto Repair Jr.", consultant: "Ana C." },
];

const ProximasPistasWidget = memo(() => (
  <Card className="border-gray-200 shadow-sm">
    <CardContent className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-blue-500" />
        <h3 className="text-sm font-bold text-gray-700">Próximas Pistas</h3>
      </div>

      <div className="space-y-2">
        {PROXIMAS_PISTAS.map(reuniao => (
          <div key={reuniao.id} className="flex items-center gap-2.5 py-1.5 border-b border-gray-50 last:border-0">
            <div className="flex items-center gap-1 text-xs text-gray-400 w-12 flex-shrink-0">
              <Clock className="w-3 h-3" />
              {reuniao.time}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-700 truncate">{reuniao.client}</p>
              <p className="text-[10px] text-gray-400">{reuniao.consultant}</p>
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
));
ProximasPistasWidget.displayName = "ProximasPistasWidget";

const OperationSidebar = memo(() => (
  <aside className="w-80 flex-shrink-0 space-y-3 hidden lg:block">
    <InteligenciaWidget />
    <ProximasPistasWidget />
  </aside>
));

OperationSidebar.displayName = "OperationSidebar";

export default OperationSidebar;