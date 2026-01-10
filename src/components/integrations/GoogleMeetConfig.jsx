import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Video, CheckCircle, FileText } from "lucide-react";
import { toast } from "sonner";

export default function GoogleMeetConfig({ user }) {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState({
    enabled: false,
    autoGenerateLinks: true,
    autoTranscribe: true,
    transcriptionLanguage: "pt-BR",
    autoGenerateAta: true,
    extractKeyPoints: true,
    notifyTranscriptionReady: true
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      // Implementar OAuth com Google Meet API
      await new Promise(resolve => setTimeout(resolve, 2000));
      return { success: true };
    },
    onSuccess: () => {
      setConfig({ ...config, enabled: true });
      toast.success("Conectado ao Google Meet!");
      queryClient.invalidateQueries({ queryKey: ["integrations-status"] });
    },
    onError: (error) => {
      toast.error("Erro ao conectar: " + error.message);
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (configData) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true };
    },
    onSuccess: () => {
      toast.success("Configurações salvas!");
    },
    onError: (error) => {
      toast.error("Erro ao salvar: " + error.message);
    }
  });

  const handleConnect = () => {
    connectMutation.mutate();
  };

  const handleSave = () => {
    saveMutation.mutate(config);
  };

  return (
    <div className="space-y-4 border-t pt-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-sm">Status da Integração</p>
          <p className="text-xs text-gray-600">
            {config.enabled ? "Conectado e gerando transcrições" : "Aguardando conexão"}
          </p>
        </div>
        {!config.enabled ? (
          <Button
            onClick={handleConnect}
            disabled={connectMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {connectMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Conectando...
              </>
            ) : (
              <>
                <Video className="w-4 h-4 mr-2" />
                Conectar Google Meet
              </>
            )}
          </Button>
        ) : (
          <Button variant="outline" onClick={() => setConfig({ ...config, enabled: false })}>
            Desconectar
          </Button>
        )}
      </div>

      {config.enabled && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-900">Transcrições Automáticas</p>
                <p className="text-xs text-blue-700 mt-1">
                  O Google Meet gera transcrições em tempo real. O sistema irá extrair pontos-chave, 
                  objetivos e ações para criar ATAs automaticamente após cada reunião.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs">Geração Automática de Links</Label>
                <p className="text-xs text-gray-500">Cria link do Meet ao agendar reunião</p>
              </div>
              <Switch
                checked={config.autoGenerateLinks}
                onCheckedChange={(v) => setConfig({ ...config, autoGenerateLinks: v })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs">Transcrição Automática</Label>
                <p className="text-xs text-gray-500">Ativa transcrição em todas as reuniões</p>
              </div>
              <Switch
                checked={config.autoTranscribe}
                onCheckedChange={(v) => setConfig({ ...config, autoTranscribe: v })}
              />
            </div>
          </div>

          {config.autoTranscribe && (
            <div>
              <Label className="text-xs mb-2 block">Idioma da Transcrição</Label>
              <Select
                value={config.transcriptionLanguage}
                onValueChange={(v) => setConfig({ ...config, transcriptionLanguage: v })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                  <SelectItem value="en-US">English (US)</SelectItem>
                  <SelectItem value="es-ES">Español</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-3 border-t pt-3">
            <p className="text-xs font-semibold text-gray-700">Processamento Inteligente</p>
            
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs">Geração Automática de ATA</Label>
                <p className="text-xs text-gray-500">Cria ATA a partir da transcrição</p>
              </div>
              <Switch
                checked={config.autoGenerateAta}
                onCheckedChange={(v) => setConfig({ ...config, autoGenerateAta: v })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs">Extrair Pontos-Chave</Label>
                <p className="text-xs text-gray-500">Identifica decisões e ações importantes</p>
              </div>
              <Switch
                checked={config.extractKeyPoints}
                onCheckedChange={(v) => setConfig({ ...config, extractKeyPoints: v })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs">Notificar Quando Pronta</Label>
                <p className="text-xs text-gray-500">Avisa quando transcrição estiver disponível</p>
              </div>
              <Switch
                checked={config.notifyTranscriptionReady}
                onCheckedChange={(v) => setConfig({ ...config, notifyTranscriptionReady: v })}
              />
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Salvar Configurações
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}