import React, { useState, useEffect, useRef } from 'react';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { MessageSquare, Send, Loader2, Bot, X, Sparkles } from "lucide-react";
import MessageBubble from "@/components/agent/MessageBubble";
import { toast } from "sonner";

export default function DiagnosticChat({ employee }) {
    const [isOpen, setIsOpen] = useState(false);
    const [conversation, setConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (isOpen && !conversation) {
            startConversation();
        }
    }, [isOpen]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const startConversation = async () => {
        try {
            // Check for existing active conversation or create new
            const conv = await base44.agents.createConversation({
                agent_name: "diagnostic_coach",
                metadata: {
                    employee_id: employee.id,
                    employee_name: employee.full_name,
                    context: "Profile Page"
                }
            });
            
            setConversation(conv);
            setMessages(conv.messages || []);

            // Subscribe to updates
            const unsubscribe = base44.agents.subscribeToConversation(conv.id, (data) => {
                setMessages(data.messages);
                setIsTyping(data.status === 'processing');
            });

            // If empty, send initial context
            if (!conv.messages || conv.messages.length === 0) {
                await base44.agents.addMessage(conv, {
                    role: "user",
                    content: `Olá, sou o colaborador ${employee.full_name} (ID: ${employee.id}). Gostaria de analisar meus diagnósticos e receber orientações.`
                });
            }

            return () => unsubscribe();
        } catch (error) {
            console.error("Error starting chat:", error);
            toast.error("Erro ao iniciar o assistente.");
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputValue.trim() || !conversation) return;

        const content = inputValue;
        setInputValue("");

        try {
            await base44.agents.addMessage(conversation, {
                role: "user",
                content: content
            });
        } catch (error) {
            console.error("Error sending message:", error);
            toast.error("Erro ao enviar mensagem.");
            setInputValue(content); // Restore input on error
        }
    };

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button 
                    className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 z-50 transition-all hover:scale-105"
                >
                    <Sparkles className="h-6 w-6 text-white" />
                </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:w-[450px] flex flex-col p-0">
                <SheetHeader className="px-6 py-4 border-b bg-slate-50">
                    <SheetTitle className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <Bot className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <span className="block text-sm font-semibold">Coach de Carreira</span>
                            <span className="block text-xs text-muted-foreground font-normal">IA Especialista em Desenvolvimento</span>
                        </div>
                    </SheetTitle>
                </SheetHeader>

                <div className="flex-1 overflow-hidden relative bg-slate-50/50">
                    <ScrollArea className="h-full px-4 py-4" ref={scrollRef}>
                        <div className="space-y-4 pb-4">
                            {messages.map((msg, idx) => (
                                <MessageBubble key={idx} message={msg} />
                            ))}
                            {isTyping && (
                                <div className="flex items-center gap-2 text-muted-foreground text-xs ml-4">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Digitando...
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>

                <div className="p-4 bg-white border-t">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                        <Input
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Pergunte sobre seus resultados..."
                            className="flex-1"
                            disabled={isTyping}
                        />
                        <Button type="submit" size="icon" disabled={!inputValue.trim() || isTyping}>
                            <Send className="h-4 w-4" />
                        </Button>
                    </form>
                </div>
            </SheetContent>
        </Sheet>
    );
}