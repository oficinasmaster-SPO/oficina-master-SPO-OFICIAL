import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Clock, FileText, Heart, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import COEXFeedbackList from "./COEXFeedbackList";

export default function COEXCDCIntegration({ employee }) {
  const navigate = useNavigate();

  const { data: coexContracts = [] } = useQuery({
    queryKey: ['coex-contracts', employee.id],
    queryFn: () => base44.entities.COEXContract.filter({ employee_id: employee.id })
  });

  const { data: cdcRecords = [] } = useQuery({
    queryKey: ['cdc-records', employee.id],
    queryFn: () => base44.entities.CDCRecord.filter({ employee_id: employee.id })
  });

  const activeCOEX = coexContracts.find(c => c.status === 'ativo');
  const daysUntilExpiry = activeCOEX ? differenceInDays(new Date(activeCOEX.end_date), new Date()) : null;

  const getExpiryStatus = () => {
    if (!daysUntilExpiry) return null;
    if (daysUntilExpiry < 0) return { color: 'red', label: 'Expirado', icon: AlertCircle };
    if (daysUntilExpiry <= 7) return { color: 'orange', label: 'Expira em breve', icon: Clock };
    if (daysUntilExpiry <= 30) return { color: 'yellow', label: 'Próximo do vencimento', icon: Clock };
    return { color: 'green', label: 'Ativo', icon: CheckCircle2 };
  };

  const expiryStatus = getExpiryStatus();

  return (
    <div className="space-y-6">
      {/* CDC Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-pink-600" />
              CDC - Conexão e Diagnóstico
            </CardTitle>
            {employee.cdc_completed ? (
              <Badge className="bg-green-100 text-green-700">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Completo
              </Badge>
            ) : (
              <Badge variant="outline" className="text-orange-600 border-orange-600">
                <AlertCircle className="w-3 h-3 mr-1" />
                Pendente
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {employee.cdc_completed ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                CDC realizado com sucesso. O salário emocional do colaborador está sendo monitorado.
              </p>
              {employee.cdc_data && (
                <div className="bg-pink-50 p-4 rounded-lg space-y-2">
                  <div className="text-sm">
                    <strong>Última atualização:</strong>{" "}
                    {employee.cdc_data.updated_date 
                      ? format(new Date(employee.cdc_data.updated_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                      : "Data não disponível"}
                  </div>
                  {employee.cdc_data.score && (
                    <div className="text-sm">
                      <strong>Score Emocional:</strong> {employee.cdc_data.score}/10
                    </div>
                  )}
                </div>
              )}
              <Button
                variant="outline"
                onClick={() => navigate(createPageUrl("CDCForm") + `?employeeId=${employee.id}`)}
                className="w-full"
              >
                Atualizar CDC
              </Button>
              
              {cdcRecords.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs font-semibold text-gray-500 mb-2">Histórico de CDC</p>
                  <div className="space-y-2">
                    {cdcRecords.sort((a, b) => new Date(b.date) - new Date(a.date)).map((rec, idx) => (
                        <div key={idx} className="text-xs flex justify-between bg-gray-50 p-2 rounded">
                            <span>{new Date(rec.date).toLocaleDateString('pt-BR')}</span>
                            <span className="text-gray-500">Ver detalhes (PDF)</span>
                        </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                O CDC ainda não foi realizado com este colaborador. Faça agora para melhorar o engajamento.
              </p>
              <Button
                onClick={() => navigate(createPageUrl("CDCForm") + `?employeeId=${employee.id}`)}
                className="w-full bg-pink-600 hover:bg-pink-700"
              >
                <Heart className="w-4 h-4 mr-2" />
                Iniciar CDC
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* COEX Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              COEX - Contrato de Expectativas
            </CardTitle>
            {activeCOEX ? (
              expiryStatus && (
                <Badge className={`bg-${expiryStatus.color}-100 text-${expiryStatus.color}-700`}>
                  <expiryStatus.icon className="w-3 h-3 mr-1" />
                  {expiryStatus.label}
                </Badge>
              )
            ) : (
              <Badge variant="outline" className="text-orange-600 border-orange-600">
                <AlertCircle className="w-3 h-3 mr-1" />
                Sem contrato
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {activeCOEX ? (
            <div className="space-y-3">
              <div className="bg-blue-50 p-4 rounded-lg space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Período:</span>
                  <span className="font-medium">
                    {format(new Date(activeCOEX.start_date), "dd/MM/yyyy")} - {format(new Date(activeCOEX.end_date), "dd/MM/yyyy")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Próximo alinhamento:</span>
                  <span className="font-medium">
                    {activeCOEX.next_alignment_date 
                      ? format(new Date(activeCOEX.next_alignment_date), "dd/MM/yyyy")
                      : "Não agendado"}
                  </span>
                </div>
                {daysUntilExpiry !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Dias restantes:</span>
                    <span className={`font-bold ${daysUntilExpiry < 0 ? 'text-red-600' : daysUntilExpiry <= 30 ? 'text-orange-600' : 'text-green-600'}`}>
                      {daysUntilExpiry < 0 ? 'EXPIRADO' : `${daysUntilExpiry} dias`}
                    </span>
                  </div>
                )}
              </div>

              {daysUntilExpiry !== null && daysUntilExpiry <= 30 && (
                <div className="bg-orange-50 border-l-4 border-orange-500 p-3 text-sm text-orange-800">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    <strong>Ação necessária:</strong>
                  </div>
                  <p className="mt-1">
                    {daysUntilExpiry < 0 
                      ? "O COEX expirou. Renove urgentemente para manter o alinhamento."
                      : "O COEX está próximo do vencimento. Agende uma renovação."}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => navigate(createPageUrl("COEXForm") + `?employeeId=${employee.id}&contractId=${activeCOEX.id}`)}
                  className="flex-1"
                >
                  Ver/Editar COEX
                </Button>
                {daysUntilExpiry !== null && daysUntilExpiry <= 30 && (
                  <Button
                    onClick={() => navigate(createPageUrl("COEXForm") + `?employeeId=${employee.id}`)}
                    className="flex-1 bg-orange-600 hover:bg-orange-700"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Renovar
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Nenhum COEX ativo. Crie um contrato para alinhar expectativas e aumentar a retenção.
              </p>
              <Button
                onClick={() => navigate(createPageUrl("COEXForm") + `?employeeId=${employee.id}`)}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <FileText className="w-4 h-4 mr-2" />
                Criar COEX
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feedback Mensal COEX */}
      {activeCOEX && (
        <COEXFeedbackList employeeId={employee.id} contractId={activeCOEX.id} />
      )}

      {/* Histórico de Contratos */}
      {coexContracts.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Histórico de COEX</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {coexContracts
                .filter(c => c.status !== 'ativo')
                .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
                .slice(0, 3)
                .map((contract) => (
                  <div key={contract.id} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                    <span className="text-gray-600">
                      {format(new Date(contract.start_date), "dd/MM/yy")} - {format(new Date(contract.end_date), "dd/MM/yy")}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {contract.status}
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}