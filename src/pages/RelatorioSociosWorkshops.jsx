import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Download, Loader2, Building2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Relatório CSV de Sócios por Oficina.
 * Colunas: workshop_nome | socio_nome | socio_telefone | empresa_telefone
 *
 * Sócio = Employee com is_partner === true OU job_role in [socio, socio_interno]
 * (telefone vem do perfil do sócio — Employee.telefone).
 * Empresa.telefone = Workshop.telefone.
 * Oficinas sem sócio perfilado aparecem com campos do sócio em branco (relatório
 * completo de todos os workshops).
 */
export default function RelatorioSociosWorkshops() {
  const { data: workshops = [], isLoading: lw } = useQuery({
    queryKey: ["rel-socios-workshops"],
    queryFn: () => base44.entities.Workshop.filter({ status: "ativo" }, "-created_date", 1000),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const { data: empPartner = [], isLoading: lp } = useQuery({
    queryKey: ["rel-socios-emp-partner"],
    queryFn: () => base44.entities.Employee.filter({ is_partner: true }, "-created_date", 3000),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const { data: empSocio = [], isLoading: ls } = useQuery({
    queryKey: ["rel-socios-emp-role"],
    queryFn: () => base44.entities.Employee.filter({ job_role: { $in: ["socio", "socio_interno"] } }, "-created_date", 3000),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const loading = lw || lp || ls;

  const { rows, sociosCount } = React.useMemo(() => {
    const byWid = new Map();
    const addEmp = (e) => {
      if (!e || !e.workshop_id || !e.id) return;
      if (!byWid.has(e.workshop_id)) byWid.set(e.workshop_id, new Map());
      byWid.get(e.workshop_id).set(e.id, e);
    };
    empPartner.forEach(addEmp);
    empSocio.forEach(addEmp);

    const out = [];
    let sCount = 0;
    workshops.forEach((w) => {
      const socios = byWid.get(w.id);
      if (!socios || socios.size === 0) {
        out.push({
          workshop_nome: w.name || "",
          socio_nome: "",
          socio_telefone: "",
          empresa_telefone: w.telefone || "",
        });
      } else {
        socios.forEach((e) => {
          sCount++;
          out.push({
            workshop_nome: w.name || "",
            socio_nome: e.full_name || "",
            socio_telefone: e.telefone || "",
            empresa_telefone: w.telefone || "",
          });
        });
      }
    });
    return { rows: out, sociosCount: sCount };
  }, [workshops, empPartner, empSocio]);

  const download = () => {
    const header = ["workshop_nome", "socio_nome", "socio_telefone", "empresa_telefone"];
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv =
      [header.join(",")]
        .concat(rows.map((r) => [r.workshop_nome, r.socio_nome, r.socio_telefone, r.empresa_telefone].map(esc).join(",")))
        .join("\r\n");
    // BOM UTF-8 para Excel reconhecer acentos
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "relatorio_socios_workshops.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Relatório de Sócios por Oficina</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gera um CSV com o nome da oficina, o sócio vinculado e os telefones (do perfil do sócio e do cadastro da empresa).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="w-4 h-4 text-gray-500" />
            {workshops.length} oficina(s) ·{" "}
            <Users className="w-4 h-4 text-gray-500 ml-1" />
            {sociosCount} sócio(s) perfilados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Carregando oficinas e sócios...
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <div className="grid grid-cols-4 bg-gray-50 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                  <div className="px-3 py-2">Oficina</div>
                  <div className="px-3 py-2">Sócio</div>
                  <div className="px-3 py-2">Tel. Sócio</div>
                  <div className="px-3 py-2">Tel. Empresa</div>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {rows.slice(0, 100).map((r, i) => (
                    <div key={i} className="grid grid-cols-4 text-xs border-t border-gray-100">
                      <div className="px-3 py-2 text-gray-800 truncate">{r.workshop_nome || "—"}</div>
                      <div className="px-3 py-2 text-gray-700 truncate">{r.socio_nome || "—"}</div>
                      <div className="px-3 py-2 text-gray-700 truncate">{r.socio_telefone || "—"}</div>
                      <div className="px-3 py-2 text-gray-700 truncate">{r.empresa_telefone || "—"}</div>
                    </div>
                  ))}
                  {rows.length > 100 && (
                    <div className="px-3 py-2 text-center text-[11px] text-gray-400">
                      +{rows.length - 100} linhas — baixe o CSV para ver todas.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={download} disabled={rows.length === 0} className="gap-2">
                  <Download className="w-4 h-4" />
                  Baixar CSV ({rows.length} linhas)
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}