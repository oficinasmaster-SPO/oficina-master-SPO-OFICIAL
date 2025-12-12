import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Building2, Video, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ProximosAtendimentos({ atendimentos, loading }) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          Próximos Atendimentos
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-gray-500">Carregando...</div>
        ) : atendimentos.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>Nenhum atendimento agendado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {atendimentos.slice(0, 5).map((atendimento) => (
              <div
                key={atendimento.id}
                className="border rounded-lg p-4 hover:shadow-md transition-all cursor-pointer bg-gradient-to-r from-blue-50/50 to-indigo-50/50"
                onClick={() => navigate(createPageUrl('RegistrarAtendimento') + `?atendimento_id=${atendimento.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="w-4 h-4 text-gray-500" />
                      <span className="font-semibold text-gray-900">
                        {atendimento.workshop_name || 'Cliente'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(atendimento.data_agendada), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(atendimento.data_agendada), "HH:mm")}
                      </div>
                      {atendimento.google_meet_link && (
                        <div className="flex items-center gap-1 text-blue-600">
                          <Video className="w-3 h-3" />
                          Meet
                        </div>
                      )}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost">
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}