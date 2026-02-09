import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Loader2, FileText } from "lucide-react";
import { generateStructuredReportPDF } from "./StructuredReportPDF";
import { toast } from "sonner";

export default function ViewStructuredReportModal({ open, onClose, reportData, workshop }) {
  const [downloading, setDownloading] = useState(false);

  const data = reportData?.data || {};

  const handleDownload = async () => {
    setDownloading(true);
    try {
      toast.info("Gerando PDF para download...");
      await generateStructuredReportPDF(data, workshop);
      toast.success("Download iniciado!");
    } catch (error) {
      toast.error("Erro ao gerar PDF: " + error.message);
    } finally {
      setDownloading(false);
    }
  };

  const maturidadeLevels = {
    0: "Nível 0 - Inexistente",
    1: "Nível 1 - Inicial",
    2: "Nível 2 - Documentado",
    3: "Nível 3 - Implementado",
    4: "Nível 4 - Gerenciado",
    5: "Nível 5 - Otimizado"
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              {reportData?.title || "Relatório de Implementação"}
            </div>
            <Button onClick={handleDownload} disabled={downloading} size="sm">
              {downloading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Baixar PDF
                </>
              )}
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Informações Iniciais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-semibold">Empresa:</span> {data.empresa || '-'}
                </div>
                <div>
                  <span className="font-semibold">Unidade/Área:</span> {data.unidade_area || '-'}
                </div>
                <div>
                  <span className="font-semibold">Data:</span> {data.data ? new Date(data.data).toLocaleDateString('pt-BR') : '-'}
                </div>
                <div>
                  <span className="font-semibold">Local:</span> {data.local || '-'}
                </div>
                <div>
                  <span className="font-semibold">Horário:</span> {data.horario_inicio} - {data.horario_termino}
                </div>
              </div>
              {data.normas_om?.length > 0 && (
                <div className="mt-2">
                  <span className="font-semibold">Normas OM:</span> {data.normas_om.join(", ")}
                </div>
              )}
            </CardContent>
          </Card>

          {data.participantes?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Participantes</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead>E-mail</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.participantes.map((p, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{p.nome}</TableCell>
                        <TableCell>{p.cargo}</TableCell>
                        <TableCell>{p.empresa}</TableCell>
                        <TableCell>{p.email}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Objetivo da Consultoria</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-line">{data.objetivo_consultoria || 'Não informado'}</p>
            </CardContent>
          </Card>

          {data.pontos_conformes && (
            <Card>
              <CardHeader>
                <CardTitle>Pontos Conformes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-line">{data.pontos_conformes}</p>
              </CardContent>
            </Card>
          )}

          {data.nao_conformidades?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Não Conformidades</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nº</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Requisito OM</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.nao_conformidades.map((nc, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{nc.numero}</TableCell>
                        <TableCell>{nc.descricao}</TableCell>
                        <TableCell>{nc.requisito_om}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {data.plano_acao?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Plano de Ação</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nº</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Prazo</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.plano_acao.map((acao, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{acao.numero}</TableCell>
                        <TableCell>{acao.acao}</TableCell>
                        <TableCell>{acao.responsavel}</TableCell>
                        <TableCell>{acao.prazo ? new Date(acao.prazo).toLocaleDateString('pt-BR') : '-'}</TableCell>
                        <TableCell>{acao.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {data.conclusao && (
            <Card>
              <CardHeader>
                <CardTitle>Conclusão</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-line">{data.conclusao}</p>
              </CardContent>
            </Card>
          )}

          {data.nivel_maturidade !== undefined && (
            <Card>
              <CardHeader>
                <CardTitle>Nível de Maturidade</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-semibold">{maturidadeLevels[data.nivel_maturidade]}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}