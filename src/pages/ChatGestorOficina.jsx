import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Send, Plus, Loader2, ExternalLink, MessageCircle } from "lucide-react";
import MessageBubble from "@/components/agent/MessageBubble";

export default function ChatGestorOficina() {
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Erro ao carregar usuário:", error);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    const loadConversations = async () => {
      try {
        const convs = await base44.agents.listConversations({
          agent_name: "Mavi"
        });
        setConversations(convs || []);
      } catch (error) {
        console.error("Erro ao carregar conversas:", error);
        setConversations([]);
      } finally {
        setLoadingConversations(false);
      }
    };

    if (user) {
      loadConversations();
    }
  }, [user]);

  useEffect(() => {
    if (!activeConversation?.id) return;

    const unsubscribe = base44.agents.subscribeToConversation(
      activeConversation.id,
      (data) => {
        setMessages(data.messages || []);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [activeConversation?.id]);

  const handleCreateConversation = async () => {
    setLoading(true);
    try {
      const newConv = await base44.agents.createConversation({
        agent_name: "Mavi",
        metadata: {
          name: `Conversa ${new Date().toLocaleDateString('pt-BR')}`,
          description: "Conversa com Gestor da Oficina AI"
        }
      });
      setConversations([newConv, ...conversations]);
      setActiveConversation(newConv);
      setMessages(newConv.messages || []);
      toast.success("Nova conversa criada!");
    } catch (error) {
      console.error("Erro ao criar conversa:", error);
      toast.error("Erro ao criar conversa");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectConversation = (conv) => {
    setActiveConversation(conv);
    setMessages(conv.messages || []);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !activeConversation) return;

    const messageContent = inputMessage.trim();
    setInputMessage("");
    setLoading(true);

    try {
      await base44.agents.addMessage(activeConversation, {
        role: "user",
        content: messageContent
      });
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      toast.error("Erro ao enviar mensagem");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const whatsappURL = base44.agents.getWhatsAppConnectURL('Mavi');

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestor da Oficina AI</h1>
        <p className="text-gray-600">
          Consulte colaboradores, analise performance, gerencie atividades e muito mais
        </p>
      </div>

      <div className="mb-4 flex gap-3">
        <a 
          href={whatsappURL} 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
        >
          <MessageCircle className="w-5 h-5" />
          Conectar no WhatsApp
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      <div className="grid lg:grid-cols-[320px,1fr] gap-6">
        {/* Lista de Conversas */}
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Conversas</CardTitle>
              <Button 
                size="sm" 
                onClick={handleCreateConversation}
                disabled={loading}
              >
                <Plus className="w-4 h-4 mr-1" />
                Nova
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loadingConversations ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm">
                Nenhuma conversa ainda. Crie uma nova!
              </div>
            ) : (
              <div className="divide-y">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                      activeConversation?.id === conv.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                    }`}
                  >
                    <p className="font-medium text-sm text-gray-900 truncate">
                      {conv.metadata?.name || 'Sem título'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(conv.created_date).toLocaleDateString('pt-BR')}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Área de Chat */}
        <Card className="flex flex-col h-[calc(100vh-16rem)]">
          <CardHeader className="border-b">
            <CardTitle className="text-lg">
              {activeConversation ? (
                activeConversation.metadata?.name || 'Conversa'
              ) : (
                'Selecione ou crie uma conversa'
              )}
            </CardTitle>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
            {!activeConversation ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <MessageCircle className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-gray-500">
                  Crie uma nova conversa ou selecione uma existente para começar
                </p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <p className="text-gray-500 mb-4">
                  Inicie a conversa com o Gestor da Oficina AI
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md">
                  <p className="text-sm text-blue-900 font-medium mb-2">
                    Exemplos de perguntas:
                  </p>
                  <ul className="text-sm text-blue-800 space-y-1 text-left">
                    <li>• Listar colaboradores ativos</li>
                    <li>• Qual a produtividade da equipe este mês?</li>
                    <li>• Quais tarefas estão pendentes?</li>
                    <li>• Status da estruturação da oficina</li>
                    <li>• Criar tarefa para João sobre treinamento</li>
                  </ul>
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <MessageBubble key={idx} message={msg} />
              ))
            )}
            <div ref={messagesEndRef} />
          </CardContent>

          <div className="border-t p-4">
            {activeConversation ? (
              <div className="flex gap-2">
                <Textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Digite sua mensagem..."
                  className="resize-none"
                  rows={2}
                  disabled={loading}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || loading}
                  size="icon"
                  className="h-auto"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </div>
            ) : (
              <div className="text-center text-sm text-gray-400">
                Crie ou selecione uma conversa para começar
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}