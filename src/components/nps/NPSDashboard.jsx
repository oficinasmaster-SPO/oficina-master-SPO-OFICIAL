import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Smile, Meh, Frown } from "lucide-react";
import NPSLinkGenerator from "./NPSLinkGenerator";

export default function NPSDashboard({ workshopId }) {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResponses = async () => {
      try {
        const res = await base44.entities.NPSResponse.filter({ workshop_id: workshopId });
        setResponses(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchResponses();
  }, [workshopId]);

  if (loading) return <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;

  const promoters = responses.filter(r => r.score >= 9).length;
  const passives = responses.filter(r => r.score >= 7 && r.score <= 8).length;
  const detractors = responses.filter(r => r.score <= 6).length;
  const total = responses.length;
  
  const npsScore = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <NPSLinkGenerator />
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-700 mb-2">{npsScore}</div>
              <div className="text-sm font-medium text-blue-900">Score NPS</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex flex-col items-center">
            <Smile className="w-8 h-8 text-green-500 mb-2" />
            <div className="text-2xl font-bold">{promoters}</div>
            <div className="text-sm text-gray-500">Promotores (9-10)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex flex-col items-center">
            <Meh className="w-8 h-8 text-yellow-500 mb-2" />
            <div className="text-2xl font-bold">{passives}</div>
            <div className="text-sm text-gray-500">Neutros (7-8)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex flex-col items-center">
            <Frown className="w-8 h-8 text-red-500 mb-2" />
            <div className="text-2xl font-bold">{detractors}</div>
            <div className="text-sm text-gray-500">Detratores (0-6)</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Últimas Avaliações</CardTitle>
        </CardHeader>
        <CardContent>
          {responses.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Nenhuma avaliação recebida ainda.</p>
          ) : (
            <div className="space-y-4">
              {responses.sort((a,b) => new Date(b.created_date) - new Date(a.created_date)).map(r => (
                <div key={r.id} className="border-b pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-white ${r.score >= 9 ? 'bg-green-500' : r.score >= 7 ? 'bg-yellow-500' : 'bg-red-500'}`}>
                      {r.score}
                    </span>
                    <div>
                      <div className="font-medium">{r.customer_name || 'Cliente Anônimo'}</div>
                      {r.customer_phone && <div className="text-xs text-gray-500">{r.customer_phone}</div>}
                    </div>
                    <div className="ml-auto text-xs text-gray-400">
                      {new Date(r.created_date).toLocaleDateString()}
                    </div>
                  </div>
                  {r.comment && <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}