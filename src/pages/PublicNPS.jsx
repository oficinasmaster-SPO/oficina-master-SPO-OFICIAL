import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2, Heart, Meh, Frown } from "lucide-react";

export default function PublicNPS() {
  const [searchParams] = useSearchParams();
  const wid = searchParams.get("wid");
  const ctx = searchParams.get("ctx") || "cliente";
  const cid = searchParams.get("cid");

  const [workshop, setWorkshop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [score, setScore] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    comment: ""
  });

  useEffect(() => {
    if (wid) {
      base44.functions.invoke('publicEndpoints', { action: 'getWorkshopInfo', data: { workshop_id: wid } })
        .then(res => {
          setWorkshop(res.data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [wid]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (score === null) return;
    
    setSubmitting(true);
    try {
      await base44.functions.invoke('publicEndpoints', {
        action: 'submitNps',
        data: {
          workshop_id: wid,
          context_type: ctx,
          context_id: cid,
          respondent_name: formData.name,
          respondent_phone: formData.phone,
          respondent_email: formData.email,
          score: score,
          comment: formData.comment,
          submitted_at: new Date().toISOString()
        }
      });
      setSubmitted(true);
    } catch (error) {
      console.error(error);
      alert("Erro ao enviar avaliação. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const getScoreColor = (value) => {
    if (value <= 6) return "bg-red-100 hover:bg-red-200 text-red-700 border-red-300";
    if (value <= 8) return "bg-yellow-100 hover:bg-yellow-200 text-yellow-700 border-yellow-300";
    return "bg-green-100 hover:bg-green-200 text-green-700 border-green-300";
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  if (!workshop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md text-center py-8">
          <Frown className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <CardTitle>Link Inválido</CardTitle>
          <CardDescription className="mt-2">Não foi possível encontrar a empresa para esta avaliação.</CardDescription>
        </Card>
      </div>
    );
  }

  if (submitted) {
    let FeedbackIcon = Heart;
    let feedbackColor = "text-green-500";
    let title = "Obrigado por avaliar!";
    let desc = "Ficamos muito felizes com sua avaliação. Continuaremos trabalhando para entregar o melhor serviço.";

    if (score <= 6) {
      FeedbackIcon = Frown;
      feedbackColor = "text-red-500";
      title = "Sentimos muito...";
      desc = "Agradecemos a sinceridade. Usaremos seu feedback para melhorar imediatamente nossos processos.";
    } else if (score <= 8) {
      FeedbackIcon = Meh;
      feedbackColor = "text-yellow-500";
      title = "Agradecemos o feedback!";
      desc = "Sua opinião é valiosa para continuarmos evoluindo.";
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md text-center py-10 shadow-lg border-t-4 border-t-blue-500">
          <FeedbackIcon className={`w-16 h-16 mx-auto mb-6 ${feedbackColor}`} />
          <CardTitle className="text-2xl mb-2">{title}</CardTitle>
          <CardDescription className="text-base px-6">{desc}</CardDescription>
        </Card>
      </div>
    );
  }

  const contextLabels = {
    cliente: "nosso serviço",
    imersao: "nossa imersão",
    treinamento: "o treinamento",
    mentoria: "a mentoria",
    monitoria: "a monitoria",
    consultoria: "nossa consultoria"
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 py-12">
      <Card className="w-full max-w-xl shadow-xl border-0 ring-1 ring-slate-200">
        <div className="bg-blue-600 p-8 rounded-t-xl text-center text-white">
          {workshop.logo_url && (
            <img src={workshop.logo_url} alt="Logo" className="h-16 mx-auto mb-4 object-contain bg-white rounded p-2" />
          )}
          <h1 className="text-2xl font-bold">{workshop.name}</h1>
          <p className="opacity-90 mt-2">Pesquisa de Satisfação</p>
        </div>

        <CardContent className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-center">
                De 0 a 10, o quanto você recomendaria {contextLabels[ctx] || "nossa empresa"} para um amigo ou colega?
              </h2>
              
              <div className="flex flex-wrap justify-center gap-2">
                {[0,1,2,3,4,5,6,7,8,9,10].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setScore(val)}
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg font-bold transition-all border-2 flex items-center justify-center
                      ${score === val ? 'ring-2 ring-blue-600 ring-offset-2 scale-110 shadow-md ' + getScoreColor(val) : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}
                    `}
                  >
                    {val}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-xs text-slate-500 font-medium px-2">
                <span>0 - Nunca recomendaria</span>
                <span>10 - Com certeza recomendaria</span>
              </div>
            </div>

            {score !== null && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-4 pt-4 border-t border-slate-100">
                <div className="space-y-2">
                  <Label>Nome Completo *</Label>
                  <Input 
                    required 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    placeholder="Seu nome"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>WhatsApp *</Label>
                    <Input 
                      required 
                      value={formData.phone} 
                      onChange={e => setFormData({...formData, phone: e.target.value})} 
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>E-mail *</Label>
                    <Input 
                      type="email" 
                      required 
                      value={formData.email} 
                      onChange={e => setFormData({...formData, email: e.target.value})} 
                      placeholder="seu@email.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>
                    {score <= 6 ? "O que aconteceu? Como podemos melhorar?" : 
                     score <= 8 ? "O que faltou para a nota ser 10?" : 
                     "O que você mais gostou?"} (Opcional)
                  </Label>
                  <Textarea 
                    value={formData.comment} 
                    onChange={e => setFormData({...formData, comment: e.target.value})} 
                    placeholder="Deixe seu comentário..."
                    className="h-24"
                  />
                </div>

                <Button type="submit" className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700" disabled={submitting}>
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Enviar Avaliação"}
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}