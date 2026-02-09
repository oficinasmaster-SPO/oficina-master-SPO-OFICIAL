import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, Loader2, MessageSquare, Sparkles } from 'lucide-react';
import MessageBubble from '@/components/agent/MessageBubble';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ChatQGPTecnico() {
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (currentConversation?.id) {
      const unsubscribe = base44.agents.subscribeToConversation(
        currentConversation.id,
        (data) => {
          setMessages(data.messages || []);
        }
      );

      return () => unsubscribe();
    }
  }, [currentConversation?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      await loadConversations();
    } catch (error) {
      console.error('Erro ao carregar usuário:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadConversations = async () => {
    try {
      const convs = await base44.agents.listConversations({
        agent_name: 'qgp_tecnico',
      });
      
      setConversations(convs || []);
      
      if (convs && convs.length > 0) {
        const latest = convs[0];
        setCurrentConversation(latest);
        setMessages(latest.messages || []);
      } else {
        await createNewConversation();
      }
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
      await createNewConversation();
    }
  };

  const createNewConversation = async () => {
    try {
      const newConv = await base44.agents.createConversation({
        agent_name: 'qgp_tecnico',
        metadata: {
          name: `QGP - ${new Date().toLocaleDateString('pt-BR')}`,
          description: 'Conversa sobre produtividade e QGP',
        },
      });
      
      setCurrentConversation(newConv);
      setMessages(newConv.messages || []);
      setConversations([newConv, ...conversations]);
    } catch (error) {
      console.error('Erro ao criar conversa:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !currentConversation || isSending) return;

    setIsSending(true);
    const messageText = inputMessage;
    setInputMessage('');

    try {
      await base44.agents.addMessage(currentConversation, {
        role: 'user',
        content: messageText,
      });
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      setInputMessage(messageText);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const whatsappURL = base44.agents.getWhatsAppConnectURL('qgp_tecnico');

  return (
    <div className="max-w-5xl mx-auto p-6">
      <Card className="shadow-lg">
        <CardHeader className="border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <CardTitle className="text-xl">Assistente QGP - Técnico</CardTitle>
                <p className="text-sm text-blue-100 mt-1">
                  Registre sua produtividade e acompanhe seu desempenho
                </p>
              </div>
            </div>
            <a
              href={whatsappURL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              💬 Conectar WhatsApp
            </a>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Alert className="m-4 border-blue-200 bg-blue-50">
            <MessageSquare className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-900">
              <strong>Comandos úteis:</strong> "Meu QGP de hoje" • "Registrar produção: 6 serviços, 2h30" • 
              "Minha posição no ranking" • "Resumo do dia" • "Minhas métricas"
            </AlertDescription>
          </Alert>

          <div className="h-[500px] overflow-y-auto p-6 space-y-4 bg-gray-50">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="p-4 bg-blue-100 rounded-full mb-4">
                  <Sparkles className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Bem-vindo ao Assistente QGP!
                </h3>
                <p className="text-gray-600 max-w-md">
                  Registre sua produção, consulte seu desempenho e acompanhe seu ranking.
                  Digite uma mensagem abaixo para começar.
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <MessageBubble key={idx} message={msg} />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t bg-white">
            <div className="flex gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Digite sua mensagem... (ex: 'Registrar 8 serviços, 4h')"
                disabled={isSending}
                className="flex-1"
              />
              <Button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isSending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}