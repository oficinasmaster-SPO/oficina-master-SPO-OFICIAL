import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { User, Briefcase, Phone, Mail, Calendar, Star, FileText, MessageSquare } from "lucide-react";

export default function CandidateDetailsModal({ open, onClose, candidate }) {
  const { data: interviews = [] } = useQuery({
    queryKey: ['candidate-interviews', candidate?.id],
    queryFn: async () => {
      if (!candidate?.id) return [];
      const result = await base44.entities.CandidateInterview.filter({
        candidate_id: candidate.id
      }, '-interview_date');
      return Array.isArray(result) ? result : [];
    },
    enabled: !!candidate?.id && open
  });

  if (!candidate) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Detalhes do Candidato</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Informações Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Nome Completo</p>
                <p className="font-medium">{candidate.full_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Cargo Pretendido</p>
                <p className="font-medium">{candidate.desired_position}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Telefone</p>
                <p className="font-medium flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  {candidate.phone}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {candidate.email || "Não informado"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <Badge className="mt-1">{candidate.status}</Badge>
              </div>
              <div>
                <p className="text-sm text-gray-500">Lead Score</p>
                <p className="font-medium flex items-center gap-2">
                  <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                  {candidate.lead_score || "Não avaliado"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Histórico de Entrevistas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Histórico de Entrevistas ({interviews.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {interviews.length === 0 ? (
                <p className="text-gray-500 text-center py-6">Nenhuma entrevista realizada ainda</p>
              ) : (
                interviews.map((interview, idx) => (
                  <Card key={interview.id} className="border-2">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">Entrevista #{interviews.length - idx}</h4>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar className="w-4 h-4" />
                          {new Date(interview.interview_date).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                      {interview.form_used_name && (
                        <Badge variant="outline" className="w-fit">
                          Formulário: {interview.form_used_name}
                        </Badge>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Script Utilizado */}
                      {interview.script_content && (
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <h5 className="font-medium mb-2 flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" />
                            Script Apresentado
                          </h5>
                          <p className="text-sm text-gray-700 whitespace-pre-line">
                            {interview.script_content}
                          </p>
                        </div>
                      )}

                      {/* Perguntas e Respostas */}
                      {interview.answers && interview.answers.length > 0 && (
                        <div>
                          <h5 className="font-medium mb-3">Perguntas e Respostas</h5>
                          <div className="space-y-3">
                            {interview.answers.map((answer, i) => (
                              <div key={i} className="border-l-4 border-blue-500 pl-3 py-2">
                                <p className="font-medium text-sm mb-1">{answer.question_text}</p>
                                <p className="text-sm text-gray-700 mb-1">{answer.answer}</p>
                                {answer.score !== undefined && (
                                  <Badge variant="outline" className="text-xs">
                                    Score: {answer.score}/10
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Scores */}
                      <div className="grid grid-cols-4 gap-2 pt-2 border-t">
                        <div className="text-center">
                          <p className="text-xs text-gray-500">Técnica</p>
                          <p className="font-semibold">{interview.technical_score?.toFixed(1) || '-'}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500">Comportamental</p>
                          <p className="font-semibold">{interview.behavioral_score?.toFixed(1) || '-'}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500">Cultural</p>
                          <p className="font-semibold">{interview.cultural_score?.toFixed(1) || '-'}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500">Final</p>
                          <p className="font-semibold text-lg">{interview.final_score?.toFixed(0) || '-'}</p>
                        </div>
                      </div>

                      {/* Notas e Recomendação */}
                      {interview.interviewer_notes && (
                        <div className="bg-gray-50 p-3 rounded">
                          <p className="text-xs text-gray-500 mb-1">Observações do Entrevistador</p>
                          <p className="text-sm">{interview.interviewer_notes}</p>
                        </div>
                      )}
                      {interview.recommendation && (
                        <Badge className="w-fit">
                          Recomendação: {interview.recommendation}
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}