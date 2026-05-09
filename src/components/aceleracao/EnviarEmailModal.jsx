import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Mail, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function EnviarEmailModal({ isOpen, onClose, tipoRelatorio = 'diario', data }) {
  const [loading, setLoading] = useState(false);
  const [emailsDestino, setEmailsDestino] = useState('');
  const [tipoDestinatario, setTipoDestinatario] = useState('proprio');
  const [enviado, setEnviado] = useState(false);

  const destinatariosPreset = {
    proprio: ['seu-email@oficinasmaster.com'],
    consultoria: ['consultoria@oficinasmaster.com'],
    admin: ['admin@oficinasmaster.com'],
    secretaria: ['secretaria@oficinasmaster.com'],
    todos: ['consultoria@oficinasmaster.com', 'admin@oficinasmaster.com', 'secretaria@oficinasmaster.com'],
    customizado: emailsDestino.split(',').map(e => e.trim()).filter(e => e),
  };

  const handleEnviar = async () => {
    try {
      setLoading(true);

      const emails = tipoDestinatario === 'customizado' 
        ? emailsDestino.split(',').map(e => e.trim()).filter(e => e)
        : destinatariosPreset[tipoDestinatario];

      if (emails.length === 0) {
        toast.error('Selecione pelo menos um destinatário');
        return;
      }

      const response = await base44.functions.invoke('enviarRelatorioEmailAutomatico', {
        tipo: tipoRelatorio,
        data: data,
        emailsDestino: emails,
      });

      if (response.data?.sucesso) {
        setEnviado(true);
        toast.success(`Email enviado para ${emails.length} destinatário(s)`);
        setTimeout(() => {
          setEnviado(false);
          setTipoDestinatario('proprio');
          setEmailsDestino('');
          onClose();
        }, 2000);
      }
    } catch (error) {
      console.error('Erro ao enviar:', error);
      toast.error('Erro ao enviar email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Enviar Relatório por Email
          </DialogTitle>
          <DialogDescription>
            Escolha os destinatários para receber o relatório com PDF anexado
          </DialogDescription>
        </DialogHeader>

        {enviado ? (
          <div className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="w-12 h-12 text-green-600 mb-4" />
            <p className="text-sm font-semibold text-gray-900">Email enviado com sucesso!</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Tipo de Destinatário</Label>
              <Select value={tipoDestinatario} onValueChange={setTipoDestinatario}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="proprio">📧 Meu Email</SelectItem>
                  <SelectItem value="consultoria">👨‍💼 Consultoria</SelectItem>
                  <SelectItem value="admin">👤 Admin</SelectItem>
                  <SelectItem value="secretaria">📋 Secretária</SelectItem>
                  <SelectItem value="todos">👥 Todos (Consultoria + Admin + Secretária)</SelectItem>
                  <SelectItem value="customizado">✉️ Customizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {tipoDestinatario === 'customizado' && (
              <div>
                <Label className="text-sm font-medium">Emails (separados por vírgula)</Label>
                <Input
                  placeholder="email1@example.com, email2@example.com"
                  value={emailsDestino}
                  onChange={(e) => setEmailsDestino(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-700">
                ✅ Relatório em HTML formatado<br />
                ✅ Gráfico ASCII de taxa<br />
                ✅ Lista de clientes atendidos<br />
                ✅ PDF com tabelas de detalhes
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="flex-1 h-9"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleEnviar}
                disabled={loading}
                className="flex-1 h-9 bg-red-600 hover:bg-red-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Enviar Email
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}