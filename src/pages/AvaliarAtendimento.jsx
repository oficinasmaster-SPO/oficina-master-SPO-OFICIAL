import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AvaliarAtendimento() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [atendimento, setAtendimento] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [avaliacao, setAvaliacao] = useState({
    nota: 0,
    foi_satisfatorio: true,
    observacoes: "",
    recomendaria: true
  });
  const [enviado, setEnviado] = useState(false);

  useEffect(() => {
    loadAtendimento();
  }, []);

  const loadAtendimento = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');

      if (!token) {
        toast.error('Link de avaliação inválido');
        setLoading(false);
        return;
      }

      // Token é o ID do atendimento
      const atend = await base44.entities.ConsultoriaAtendimento.get(token);
      
      if (!atend) {
        toast.error('Atendimento não encontrado');
        setLoading(false);
        return;
      }

      setAtendimento(atend);

      // Buscar workshop
      const ws = await base44.entities.Workshop.get(atend.workshop_id);
      setWorkshop(ws);

    } catch (error) {
      console.error('Erro ao carregar:', error);
      toast.error('Erro ao carregar dados do atendimento');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (avaliacao.nota === 0) {
      toast.error('Por favor, selecione uma nota');
      return;
    }

    setSubmitting(true);

    try {
      await base44.entities.ConsultoriaAvaliacao.create({
        atendimento_id: atendimento.id,
        workshop_id: atendimento.workshop_id,
        avaliador_nome: workshop?.name || 'Cliente',
        avaliador_email: '',
        nota: avaliacao.nota,
        foi_satisfatorio: avaliacao.foi_satisfatorio,
        observacoes: avaliacao.observacoes,
        recomendaria: avaliacao.recomendaria
      });

      // Atualizar atendimento com avaliação
      await base44.entities.ConsultoriaAtendimento.update(atendimento.id, {
        avaliacao_cliente: {
          nota: avaliacao.nota,
          comentario: avaliacao.observacoes,
          data: new Date().toISOString()
        }
      });

      setEnviado(true);
      toast.success('Avaliação enviada com sucesso!');

    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao enviar avaliação');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!atendimento) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-gray-600">Link de avaliação inválido ou expirado</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (enviado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Obrigado pela sua avaliação!
            </h2>
            <p className="text-gray-600">
              Seu feedback é muito importante para continuarmos melhorando nossos atendimentos.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Avalie seu Atendimento</CardTitle>
            <div className="text-center text-sm text-gray-600 mt-2">
              <p><strong>{workshop?.name}</strong></p>
              <p>Atendimento realizado em {new Date(atendimento.data_realizada || atendimento.data_agendada).toLocaleDateString('pt-BR')}</p>
              <p>Consultor: {atendimento.consultor_nome}</p>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Avaliação por Estrelas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
                  Como você avalia este atendimento?
                </label>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setAvaliacao({ ...avaliacao, nota: star })}
                      className="focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-10 h-10 ${
                          star <= avaliacao.nota
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {avaliacao.nota > 0 && (
                  <p className="text-center text-sm text-gray-600 mt-2">
                    {avaliacao.nota === 5 ? 'Excelente!' :
                     avaliacao.nota === 4 ? 'Muito Bom!' :
                     avaliacao.nota === 3 ? 'Bom' :
                     avaliacao.nota === 2 ? 'Regular' : 'Precisa Melhorar'}
                  </p>
                )}
              </div>

              {/* Satisfatório? */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  O atendimento foi satisfatório?
                </label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setAvaliacao({ ...avaliacao, foi_satisfatorio: true })}
                    className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
                      avaliacao.foi_satisfatorio
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-300 hover:border-green-300'
                    }`}
                  >
                    Sim
                  </button>
                  <button
                    type="button"
                    onClick={() => setAvaliacao({ ...avaliacao, foi_satisfatorio: false })}
                    className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
                      !avaliacao.foi_satisfatorio
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-300 hover:border-red-300'
                    }`}
                  >
                    Não
                  </button>
                </div>
              </div>

              {/* Recomendaria? */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Você recomendaria nosso serviço?
                </label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setAvaliacao({ ...avaliacao, recomendaria: true })}
                    className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
                      avaliacao.recomendaria
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-blue-300'
                    }`}
                  >
                    Sim
                  </button>
                  <button
                    type="button"
                    onClick={() => setAvaliacao({ ...avaliacao, recomendaria: false })}
                    className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
                      !avaliacao.recomendaria
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-gray-300 hover:border-orange-300'
                    }`}
                  >
                    Não
                  </button>
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observações e Feedback (opcional)
                </label>
                <Textarea
                  value={avaliacao.observacoes}
                  onChange={(e) => setAvaliacao({ ...avaliacao, observacoes: e.target.value })}
                  placeholder="Deixe seu comentário sobre o atendimento..."
                  rows={4}
                />
              </div>

              <Button
                type="submit"
                disabled={submitting || avaliacao.nota === 0}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar Avaliação'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}