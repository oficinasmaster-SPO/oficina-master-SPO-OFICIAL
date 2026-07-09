import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TrendingUp, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const FIELDS = [
  { key: "faturamento_mes", label: "Faturamento do mês", prefix: "R$" },
  { key: "ticket_medio", label: "Ticket médio", prefix: "R$" },
  { key: "clientes_atendidos", label: "Clientes atendidos", prefix: "" },
  { key: "prospeccao_kit_master", label: "Prospecção Kit Master", prefix: "" },
  { key: "faturado_kit_master", label: "Faturado Kit Master", prefix: "R$" },
  { key: "prospeccao_trafego_pago", label: "Prospecção Tráfego Pago", prefix: "" },
  { key: "faturado_trafego_pago", label: "Faturado Tráfego Pago", prefix: "R$" },
  { key: "lucro_operacional", label: "Lucro operacional", prefix: "R$" },
];

export default function ClientIndicatorsSection({ workshopId, atendimentoId, followUpId }) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState({});
  const [mesReferencia, setMesReferencia] = useState(new Date().toISOString().slice(0, 7));

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        workshop_id: workshopId,
        mes_referencia: mesReferencia,
        data_registro: mesReferencia + "-01",
      };
      if (atendimentoId) payload.atendimento_id = atendimentoId;
      if (followUpId) payload.followup_id = followUpId;
      FIELDS.forEach((f) => {
        payload[f.key] = values[f.key] ? Number(values[f.key]) : 0;
      });
      return base44.entities.ClientIndicator.create(payload);
    },
    onSuccess: () => {
      toast.success("Indicadores do cliente salvos!");
      setValues({});
      queryClient.invalidateQueries({ queryKey: ["client-indicators", workshopId] });
    },
    onError: (err) => toast.error("Erro ao salvar indicadores: " + err.message),
  });

  if (!workshopId) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-600" />
          Indicadores do Cliente (opcional)
        </CardTitle>
        <p className="text-sm text-gray-600">Captura rápida para alimentar a evolução do cliente</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-xs">Mês de referência</Label>
          <Input
            type="month"
            value={mesReferencia}
            onChange={(e) => setMesReferencia(e.target.value)}
            className="max-w-[180px]"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {FIELDS.map((f) => (
            <div key={f.key}>
              <Label className="text-xs">{f.label}</Label>
              <div className="relative">
                {f.prefix && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">
                    {f.prefix}
                  </span>
                )}
                <Input
                  type="number"
                  step="0.01"
                  value={values[f.key] ?? ""}
                  onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  className={f.prefix ? "pl-9" : ""}
                  placeholder="0"
                />
              </div>
            </div>
          ))}
        </div>
        <Button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="bg-green-600 hover:bg-green-700"
        >
          {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Salvar indicadores
        </Button>
      </CardContent>
    </Card>
  );
}