import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function PublicNPS() {
  const [searchParams] = useSearchParams();
  const wid = searchParams.get('wid');
  
  const [workshop, setWorkshop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  
  const [score, setScore] = useState(null);
  const [comment, setComment] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  useEffect(() => {
    if (!wid) {
      setLoading(false);
      return;
    }
    
    const fetchWorkshop = async () => {
      try {
        const res = await base44.functions.invoke('getPublicWorkshopInfo', { workshop_id: wid });
        if (res.data && !res.data.error) {
          setWorkshop(res.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchWorkshop();
  }, [wid]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (score === null) {
      toast.error("Por favor, selecione uma nota.");
      return;
    }
    
    setSubmitting(true);
    try {
      await base44.entities.NPSResponse.create({
        workshop_id: wid,
        score,
        comment,
        customer_name: customerName,
        customer_phone: customerPhone
      });
      setCompleted(true);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao enviar avaliação.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  if (!wid || !workshop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center text-gray-600">
            Página não encontrada ou link inválido.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full text-center py-8">
          <CardContent>
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Obrigado!</h2>
            <p className="text-gray-600">Sua avaliação foi registrada com sucesso.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-xl w-full">
        <CardHeader className="text-center">
          {workshop.logo_url && (
            <img src={workshop.logo_url} alt={workshop.name} className="h-16 object-contain mx-auto mb-4" />
          )}
          <CardTitle className="text-2xl">Avaliação de Atendimento</CardTitle>
          <CardDescription>
            Como você avalia sua experiência com a <strong>{workshop.name}</strong>?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label className="text-center block mb-4">
                Em uma escala de 0 a 10, o quanto você recomendaria nossos serviços?
              </Label>
              <div className="flex justify-between gap-1 sm:gap-2 flex-wrap">
                {[0,1,2,3,4,5,6,7,8,9,10].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setScore(num)}
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full font-bold transition-all ${
                      score === num 
                        ? 'bg-blue-600 text-white shadow-lg transform scale-110' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-2 px-1">
                <span>0 - Não recomendaria</span>
                <span>10 - Com certeza recomendaria</span>
              </div>
            </div>

            <div>
              <Label htmlFor="comment">Gostaria de deixar um comentário? (Opcional)</Label>
              <Textarea 
                id="comment" 
                placeholder="Conte-nos o motivo da sua nota..." 
                value={comment}
                onChange={e => setComment(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Seu Nome (Opcional)</Label>
                <Input 
                  id="name" 
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="phone">Seu Telefone (Opcional)</Label>
                <Input 
                  id="phone" 
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Enviar Avaliação
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}