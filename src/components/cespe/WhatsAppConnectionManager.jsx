import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Smartphone, QrCode, Wifi, WifiOff, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function WhatsAppConnectionManager({ workshopId }) {
  const [instanceName, setInstanceName] = useState(`oficina_${workshopId}`);
  const [qrCode, setQrCode] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [loading, setLoading] = useState(false);

  const invokeEvolutionAPI = async (action) => {
    const { base44 } = await import("@/api/base44Client");
    const response = await base44.functions.invoke("manageEvolutionAPI", {
      action,
      instanceName
    });
    return response.data;
  };

  const createInstance = async () => {
    setLoading(true);
    try {
      await invokeEvolutionAPI('create');
      toast.success("Instância criada! Aguarde o QR Code...");
      await fetchQRCode();
    } catch (error) {
      console.error('Erro:', error);
      toast.error(error.message || "Erro ao conectar");
    } finally {
      setLoading(false);
    }
  };

  const fetchQRCode = async () => {
    try {
      const data = await invokeEvolutionAPI('connect');
      if (data?.qrcode?.base64) {
        setQrCode(data.qrcode.base64);
        setConnectionStatus("waiting_scan");
        checkConnection();
      }
    } catch (error) {
      console.error('Erro ao buscar QR Code:', error);
    }
  };

  const checkConnection = async () => {
    try {
      const data = await invokeEvolutionAPI('state');
      if (data?.state === 'open') {
        setConnectionStatus("connected");
        setQrCode(null);
        toast.success("WhatsApp conectado com sucesso!");
      } else if (data?.state === 'close') {
        setConnectionStatus("disconnected");
      } else {
        setTimeout(checkConnection, 3000);
      }
    } catch (error) {
      console.error('Erro ao verificar conexão:', error);
    }
  };

  const disconnectInstance = async () => {
    setLoading(true);
    try {
      await invokeEvolutionAPI('logout');
      setConnectionStatus("disconnected");
      setQrCode(null);
      toast.success("WhatsApp desconectado");
    } catch (error) {
      toast.error("Erro ao desconectar");
    } finally {
      setLoading(false);
    }
  };

  const deleteInstance = async () => {
    if (!confirm("Tem certeza que deseja deletar a instância?")) return;

    setLoading(true);
    try {
      await invokeEvolutionAPI('delete');
      setConnectionStatus("disconnected");
      setQrCode(null);
      toast.success("Instância deletada");
    } catch (error) {
      toast.error("Erro ao deletar instância");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="w-5 h-5" />
          Conexão WhatsApp (Evolution API)
          {connectionStatus === "connected" && (
            <Badge className="bg-green-100 text-green-800">
              <Wifi className="w-3 h-3 mr-1" />
              Conectado
            </Badge>
          )}
          {connectionStatus === "disconnected" && (
            <Badge variant="outline">
              <WifiOff className="w-3 h-3 mr-1" />
              Desconectado
            </Badge>
          )}
          {connectionStatus === "waiting_scan" && (
            <Badge className="bg-yellow-100 text-yellow-800">
              <QrCode className="w-3 h-3 mr-1" />
              Aguardando Scan
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {connectionStatus === "disconnected" && (
          <>
            <div>
              <Label>Nome da Instância</Label>
              <Input
                value={instanceName}
                onChange={(e) => setInstanceName(e.target.value)}
              />
            </div>

            <Button 
              onClick={createInstance} 
              disabled={loading}
              className="w-full"
            >
              {loading ? "Conectando..." : "Gerar QR Code"}
            </Button>
          </>
        )}

        {qrCode && connectionStatus === "waiting_scan" && (
          <div className="text-center space-y-4">
            <div className="bg-white p-4 rounded-lg border-2 border-dashed border-blue-300 inline-block">
              <img 
                src={qrCode} 
                alt="QR Code WhatsApp" 
                className="w-64 h-64"
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Escaneie este QR Code com seu WhatsApp:</p>
              <ol className="text-xs text-gray-600 text-left space-y-1">
                <li>1. Abra o WhatsApp no celular</li>
                <li>2. Toque em <strong>Mais opções</strong> (⋮) → <strong>Aparelhos conectados</strong></li>
                <li>3. Toque em <strong>Conectar um aparelho</strong></li>
                <li>4. Aponte o celular para esta tela</li>
              </ol>
            </div>
            <Button 
              onClick={fetchQRCode} 
              variant="outline" 
              size="sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar QR Code
            </Button>
          </div>
        )}

        {connectionStatus === "connected" && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <Wifi className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="font-medium text-green-900">WhatsApp Conectado!</p>
              <p className="text-xs text-green-700 mt-1">
                Leads serão capturados automaticamente quando alguém enviar mensagens com palavras-chave
              </p>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={disconnectInstance} 
                variant="outline"
                disabled={loading}
                className="flex-1"
              >
                Desconectar
              </Button>
              <Button 
                onClick={deleteInstance} 
                variant="destructive"
                disabled={loading}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
          <strong>⚠️ Aviso:</strong> Evolution API viola os termos do WhatsApp. Use por sua conta e risco.
        </div>
      </CardContent>
    </Card>
  );
}