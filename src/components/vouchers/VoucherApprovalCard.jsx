import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Loader2, CheckCircle2, XCircle, Upload, Clock, AlertTriangle,
  ShoppingCart, FileText, Receipt, User
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function VoucherApprovalCard({ use, adminUser }) {
  const queryClient = useQueryClient();
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [paymentFile, setPaymentFile] = useState(null);
  const [contractFile, setContractFile] = useState(null);
  const [uploadingPayment, setUploadingPayment] = useState(false);
  const [uploadingContract, setUploadingContract] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState(null);
  const [contractUrl, setContractUrl] = useState(null);

  const deadlinePassed = use.approval_deadline && new Date(use.approval_deadline) < new Date();

  const handleUpload = async (file, type) => {
    if (!file) return;
    const setUploading = type === "payment" ? setUploadingPayment : setUploadingContract;
    const setUrl = type === "payment" ? setPaymentUrl : setContractUrl;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setUrl(file_url);
      toast.success(`${type === "payment" ? "Comprovante" : "Contrato"} enviado!`);
    } catch (err) {
      toast.error("Erro ao enviar arquivo: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const approveMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke("approveVoucher", {
        voucher_use_id: use.id,
        action: "approve",
        approval_notes: approvalNotes,
        file_urls: {
          payment_receipt: paymentUrl,
          payment_receipt_name: paymentFile?.name,
          contract: contractUrl,
          contract_name: contractFile?.name
        }
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["pendingUses"]);
      queryClient.invalidateQueries(["voucherUses"]);
      queryClient.invalidateQueries(["vouchers"]);
      toast.success("Voucher aprovado com sucesso!");
      setShowApproveDialog(false);
    },
    onError: (error) => {
      toast.error(error?.response?.data?.error || "Erro ao aprovar");
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke("approveVoucher", {
        voucher_use_id: use.id,
        action: "reject",
        rejection_reason: rejectionReason
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["pendingUses"]);
      queryClient.invalidateQueries(["voucherUses"]);
      queryClient.invalidateQueries(["vouchers"]);
      toast.success("Voucher rejeitado.");
      setShowRejectDialog(false);
    },
    onError: (error) => {
      toast.error(error?.response?.data?.error || "Erro ao rejeitar");
    }
  });

  const canApprove = paymentUrl && contractUrl && approvalNotes.trim();

  return (
    <>
      <Card className={deadlinePassed ? "border-red-300 bg-red-50/50" : ""}>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Info principal */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-yellow-100 text-yellow-800 font-mono">{use.voucher_code}</Badge>
                {deadlinePassed && (
                  <Badge className="bg-red-100 text-red-700">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Prazo expirado
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-500">Cliente:</span>
                  <span className="font-medium">{use.client_name}</span>
                </div>
                {use.client_document && (
                  <div className="text-gray-500">
                    Doc: <span className="font-medium text-gray-700">{use.client_document}</span>
                  </div>
                )}
                <div className="text-gray-500">
                  Vendedor: <span className="font-medium text-gray-700">{use.used_by_seller_name}</span>
                </div>
                <div className="text-gray-500">
                  Data: <span className="font-medium text-gray-700">
                    {use.used_at && format(new Date(use.used_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </span>
                </div>
              </div>

              {use.negotiation_notes && (
                <p className="text-sm text-gray-600 italic bg-gray-50 rounded p-2">
                  "{use.negotiation_notes}"
                </p>
              )}
            </div>

            {/* Valores */}
            <div className="lg:w-48 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Venda:</span>
                <span className="font-medium">R$ {use.sale_value?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-green-700">
                <span>Desconto:</span>
                <span>- R$ {use.discount_applied?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-1">
                <span>Final:</span>
                <span>R$ {use.final_value?.toFixed(2)}</span>
              </div>
              {use.approval_deadline && (
                <div className="flex items-center gap-1 text-xs text-gray-400 pt-1">
                  <Clock className="w-3 h-3" />
                  Prazo: {format(new Date(use.approval_deadline), "dd/MM HH:mm", { locale: ptBR })}
                </div>
              )}
            </div>

            {/* Ações */}
            <div className="flex lg:flex-col gap-2 lg:w-36 justify-end">
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 flex-1"
                onClick={() => setShowApproveDialog(true)}
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Aprovar
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="flex-1"
                onClick={() => setShowRejectDialog(true)}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Rejeitar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog Aprovar */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="w-5 h-5" />
              Aprovar Uso — {use.voucher_code}
            </DialogTitle>
            <DialogDescription>
              Cliente: {use.client_name} · Venda R$ {use.sale_value?.toFixed(2)} · Final R$ {use.final_value?.toFixed(2)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Comprovante de pagamento */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Receipt className="w-4 h-4" />
                Comprovante de Pagamento *
              </Label>
              {paymentUrl ? (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-green-800 flex-1 truncate">{paymentFile?.name || "Arquivo enviado"}</span>
                  <Button variant="ghost" size="sm" onClick={() => { setPaymentUrl(null); setPaymentFile(null); }}>
                    Trocar
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <Input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    className="hidden"
                    id="payment-upload"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) { setPaymentFile(f); handleUpload(f, "payment"); }
                    }}
                  />
                  <label htmlFor="payment-upload" className="cursor-pointer">
                    {uploadingPayment ? (
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                    ) : (
                      <>
                        <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">Clique para enviar comprovante</p>
                        <p className="text-xs text-gray-400">PDF, JPG, PNG</p>
                      </>
                    )}
                  </label>
                </div>
              )}
            </div>

            {/* Contrato */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Contrato *
              </Label>
              {contractUrl ? (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-green-800 flex-1 truncate">{contractFile?.name || "Arquivo enviado"}</span>
                  <Button variant="ghost" size="sm" onClick={() => { setContractUrl(null); setContractFile(null); }}>
                    Trocar
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <Input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                    className="hidden"
                    id="contract-upload"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) { setContractFile(f); handleUpload(f, "contract"); }
                    }}
                  />
                  <label htmlFor="contract-upload" className="cursor-pointer">
                    {uploadingContract ? (
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                    ) : (
                      <>
                        <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">Clique para enviar contrato</p>
                        <p className="text-xs text-gray-400">PDF, JPG, PNG, DOC</p>
                      </>
                    )}
                  </label>
                </div>
              )}
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <Label>Observações da Aprovação *</Label>
              <Textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Registre as observações da aprovação..."
                rows={3}
              />
            </div>

            {/* Validação visual */}
            {!canApprove && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Para aprovar, você precisa:</p>
                  <ul className="list-disc list-inside mt-1 space-y-0.5">
                    {!paymentUrl && <li>Enviar comprovante de pagamento</li>}
                    {!contractUrl && <li>Enviar contrato</li>}
                    {!approvalNotes.trim() && <li>Preencher observações</li>}
                  </ul>
                </div>
              </div>
            )}

            <Button
              onClick={() => approveMutation.mutate()}
              disabled={!canApprove || approveMutation.isPending}
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
            >
              {approveMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              Confirmar Aprovação
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Rejeitar */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <XCircle className="w-5 h-5" />
              Rejeitar Uso — {use.voucher_code}
            </DialogTitle>
            <DialogDescription>
              Cliente: {use.client_name} · Venda R$ {use.sale_value?.toFixed(2)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              Ao rejeitar, o voucher será reativado para uso futuro e o vendedor será notificado.
            </div>

            <div className="space-y-2">
              <Label>Motivo da Rejeição *</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explique o motivo da rejeição..."
                rows={3}
              />
            </div>

            <Button
              onClick={() => rejectMutation.mutate()}
              disabled={!rejectionReason.trim() || rejectMutation.isPending}
              variant="destructive"
              className="w-full"
              size="lg"
            >
              {rejectMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              Confirmar Rejeição
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}