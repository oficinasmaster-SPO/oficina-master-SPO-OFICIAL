import React, { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TrendingUp, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const FIELDS = [
  { key: "faturamento_mes", label: "Faturamento do mês", type: "currency" },
  { key: "ticket_medio", label: "Ticket médio", type: "currency", computed: true },
  { key: "clientes_atendidos", label: "Clientes atendidos", type: "number" },
  { key: "prospeccao_kit_master", label: "Prospecção Kit Master", type: "number" },
  { key: "faturado_kit_master", label: "Faturado Kit Master", type: "currency" },
  { key: "prospeccao_trafego_pago", label: "Prospecção Tráfego Pago", type: "number" },
  { key: "faturado_trafego_pago", label: "Faturado Tráfego Pago", type: "currency" },
  { key: "lucro_operacional", label: "Lucro operacional", type: "currency" },
];

function formatCurrency(value) {
  if (!value && value !== 0) return "";
  return Number(value).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseCurrency(text) {
  const cleaned = text.replace(/[^\d]/g, "");
  if (!cleaned) return "";
  return (parseInt(cleaned, 10) / 100).toString();
}

function CurrencyInput({ id, value, onChange, placeholder = "0,00" }) {
  const displayValue = value ? formatCurrency(value) : "";

  function handleChange(e) {
    const raw = parseCurrency(e.target.value);
    onChange(raw);
  }

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
        R$
      </span>
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        className="pl-9"
      />
    </div>
  );
}

export default function ClientIndicatorsSection({ workshopId, atendimentoId, followUpId }) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState({});
  const [mesReferencia, setMesReferencia] = useState(new Date().toISOString().slice(0, 7));

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ["client-indicators", workshopId, mesReferencia],
    queryFn: () => base44.entities.ClientIndicator.filter({ workshop_id: workshopId }, "data_registro", 200),
    enabled: !!workshopId,
    select: (records) => records.find((r) => r.mes_referencia === mesReferencia),
  });

  useEffect(() => {
    if (existing) {
      const loaded = {};
      FIELDS.forEach((f) => {
        if (f.computed) return; // calculado automaticamente
        if (existing[f.key] && Number(existing[f.key]) !== 0) {
          loaded[f.key] = String(existing[f.key]);
        }
      });
      setValues(loaded);
    } else {
      setValues({});
    }
  }, [existing]);

  const faturamentoMes = Number(values.faturamento_mes) || 0;
  const clientesAtendidos = Number(values.clientes_atendidos) || 0;
  const ticketMedio = clientesAtendidos > 0 ? faturamentoMes / clientesAtendidos : 0;

  const hasAnyValue = Object.values(values).some((v) => v && Number(v) > 0);
  const isEditing = !!existing;

  const handleFieldChange = useCallback((key, val) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  }, []);

  const mutation = useMutation({
    mutationFn: async () => {
      const data = {
        workshop_id: workshopId,
        mes_referencia: mesReferencia,
        data_registro: mesReferencia + "-01",
        ...Object.fromEntries(
          FIELDS.map((f) => [
            f.key,
            f.computed
              ? (f.key === "ticket_medio" ? Number(ticketMedio.toFixed(2)) : 0)
              : values[f.key]
              ? Number(values[f.key])
              : 0,
          ])
        ),
      };
      if (atendimentoId) data.atendimento_id = atendimentoId;
      if (followUpId) data.followup_id = followUpId;

      if (existing?.id) {
        return base44.entities.ClientIndicator.update(existing.id, data);
      }
      return base44.entities.ClientIndicator.create(data);
    },
    onSuccess: () => {
      toast.success(isEditing ? "Indicadores atualizados!" : "Indicadores salvos!");
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
        <p className="text-sm text-muted-foreground">
          Captura rápida para alimentar a evolução do cliente
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="mes-ref" className="text-xs">Mês de referência</Label>
          <div className="flex items-center gap-2">
            <Input
              id="mes-ref"
              type="month"
              value={mesReferencia}
              onChange={(e) => setMesReferencia(e.target.value)}
              className="max-w-[200px]"
            />
            {loadingExisting && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            {isEditing && !loadingExisting && (
              <span className="text-xs text-amber-600 font-medium">Editando existente</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FIELDS.map((f) => (
            <div key={f.key}>
              <Label htmlFor={f.key} className="text-xs flex items-center gap-1">
                {f.label}
                {f.computed && (
                  <span className="text-[10px] text-muted-foreground font-normal">(automático)</span>
                )}
              </Label>
              {f.computed ? (
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                    R$
                  </span>
                  <Input
                    id={f.key}
                    type="text"
                    value={ticketMedio ? formatCurrency(ticketMedio) : ""}
                    readOnly
                    placeholder="0,00"
                    className="pl-9 bg-muted/40 text-muted-foreground cursor-not-allowed"
                  />
                </div>
              ) : f.type === "currency" ? (
                <CurrencyInput
                  id={f.key}
                  value={values[f.key] ?? ""}
                  onChange={(val) => handleFieldChange(f.key, val)}
                />
              ) : (
                <Input
                  id={f.key}
                  type="text"
                  inputMode="numeric"
                  value={values[f.key] ?? ""}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/\D/g, "");
                    handleFieldChange(f.key, cleaned);
                  }}
                  placeholder="0"
                />
              )}
            </div>
          ))}
        </div>

        <Button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !hasAnyValue}
          className="bg-green-600 hover:bg-green-700"
        >
          {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {isEditing ? "Atualizar indicadores" : "Salvar indicadores"}
        </Button>

        {!hasAnyValue && (
          <p className="text-xs text-muted-foreground">
            Preencha ao menos um campo para salvar.
          </p>
        )}
      </CardContent>
    </Card>
  );
}