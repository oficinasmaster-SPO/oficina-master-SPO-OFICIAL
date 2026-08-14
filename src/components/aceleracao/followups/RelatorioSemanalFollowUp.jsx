import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, FileDown, Printer, ChevronDown } from "lucide-react";
import { toast } from "sonner";

/**
 * S6 — Relatório Semanal de Follow-ups
 *
 * Invoca a function relatorioSemanalFollowUp e renderiza uma tabela
 * estilizada com opção de imprimir como PDF (Ctrl+P / botão).
 *
 * Colunas:
 *   Consultor | Cliente | Dia(s) atendido(s) | FUs fechados | FUs atrasados | FUs sem retorno
 */
export default function RelatorioSemanalFollowUp() {
  const [semana, setSemana] = useState("atual");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const printRef = useRef(null);

  const gerarRelatorio = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("relatorioSemanalFollowUp", { semana });
      if (res?.data?.ok) {
        setData(res.data);
      } else {
        toast.error(res?.data?.error || "Erro ao gerar relatório");
      }
    } catch (e) {
      toast.error("Erro: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    const printContent = printRef.current.innerHTML;
    const win = window.open("", "_blank");
    win.document.write(`
      <html>
      <head>
        <title>Relat\u00f3rio Semanal Follow-ups \u2014 ${data?.periodo || ""}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 24px; color: #1a1a1a; font-size: 11px; }
          h1 { font-size: 16px; margin-bottom: 4px; }
          .periodo { font-size: 12px; color: #666; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th { background: #f3f4f6; font-weight: 700; text-transform: uppercase; font-size: 9px; letter-spacing: 0.5px; color: #6b7280; padding: 8px 6px; border-bottom: 2px solid #e5e7eb; text-align: left; }
          td { padding: 6px; border-bottom: 1px solid #f3f4f6; font-size: 11px; }
          tr:nth-child(even) { background: #fafafa; }
          .num { text-align: center; font-weight: 600; font-variant-numeric: tabular-nums; }
          .warn { color: #dc2626; font-weight: 700; }
          .totais { margin-top: 20px; }
          .totais td { font-weight: 700; border-top: 2px solid #e5e7eb; }
          .footer { margin-top: 24px; font-size: 9px; color: #9ca3af; text-align: center; }
          @media print { body { padding: 12px; } }
        </style>
      </head>
      <body>
        ${printContent}
        <div class="footer">Gerado em ${new Date().toLocaleString("pt-BR")} \u2014 Oficinas Master SPO</div>
      </body>
      </html>
    `);
    win.document.close();
    setTimeout(() => { win.print(); }, 300);
  };

  return (
    <div className="space-y-4">
      {/* Controles */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <select
            value={semana}
            onChange={(e) => setSemana(e.target.value)}
            className="h-9 px-3 pr-8 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-500 appearance-none"
          >
            <option value="atual">Semana atual</option>
            <option value="anterior">Semana anterior</option>
          </select>
        </div>

        <Button
          onClick={gerarRelatorio}
          disabled={loading}
          className="bg-red-600 hover:bg-red-700 text-white h-9"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Gerando...</>
          ) : (
            <><FileDown className="w-4 h-4 mr-2" />Gerar relatório</>
          )}
        </Button>

        {data && (
          <Button
            variant="outline"
            onClick={handlePrint}
            className="h-9"
          >
            <Printer className="w-4 h-4 mr-2" />
            Imprimir / Salvar PDF
          </Button>
        )}
      </div>

      {/* Resultado */}
      {data && (
        <div ref={printRef}>
          <h1 className="text-lg font-bold text-gray-900">
            Relatório Semanal de Follow-ups
          </h1>
          <p className="periodo text-sm text-gray-500 mb-4">
            Período: {data.periodo} · {data.totalLinhas} registro{data.totalLinhas !== 1 ? "s" : ""}
          </p>

          {/* Totais por consultor */}
          {data.totais && data.totais.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {data.totais.map((t, i) => (
                <div
                  key={i}
                  className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1"
                >
                  <p className="text-sm font-bold text-gray-800">{t.consultor}</p>
                  <div className="flex gap-4 text-xs text-gray-600">
                    <span><strong className="text-emerald-700">{t.clientesAtendidos}</strong> clientes</span>
                    <span><strong className="text-blue-700">{t.fusFechados}</strong> fechados</span>
                    <span><strong className={t.fusAtrasados > 0 ? "text-red-600" : "text-gray-400"}>{t.fusAtrasados}</strong> atrasados</span>
                    <span><strong className={t.fusSemRetorno > 0 ? "text-orange-600" : "text-gray-400"}>{t.fusSemRetorno}</strong> sem retorno</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tabela */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-200">
                  <th className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Consultor</th>
                  <th className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Cliente</th>
                  <th className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Dia(s) atendido(s)</th>
                  <th className="text-center py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Fechados</th>
                  <th className="text-center py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Atrasados</th>
                  <th className="text-center py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Sem retorno</th>
                </tr>
              </thead>
              <tbody>
                {data.linhas.map((l, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                    <td className="py-2 px-3 text-gray-700 font-medium">{l.consultor}</td>
                    <td className="py-2 px-3 text-gray-900 font-semibold">{l.cliente}</td>
                    <td className="py-2 px-3 text-gray-500 text-xs">{l.diasAtendidos || "—"}</td>
                    <td className="py-2 px-3 text-center font-bold text-blue-700 tabular-nums">{l.fusFechados}</td>
                    <td className={`py-2 px-3 text-center font-bold tabular-nums ${l.fusAtrasados > 0 ? "text-red-600" : "text-gray-300"}`}>
                      {l.fusAtrasados}
                    </td>
                    <td className={`py-2 px-3 text-center font-bold tabular-nums ${l.fusSemRetorno > 0 ? "text-orange-600" : "text-gray-300"}`}>
                      {l.fusSemRetorno}
                    </td>
                  </tr>
                ))}
                {data.linhas.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">
                      Nenhum registro encontrado para este período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
