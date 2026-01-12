import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function TesteOpenAI() {
    const [message, setMessage] = useState("");
    const [response, setResponse] = useState("");
    const [displayedResponse, setDisplayedResponse] = useState("");
    const [loading, setLoading] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [includeData, setIncludeData] = useState(true);
    const [usage, setUsage] = useState(null);
    const typingIntervalRef = useRef(null);

    useEffect(() => {
        if (!response || response === displayedResponse) {
            setIsTyping(false);
            return;
        }

        setIsTyping(true);
        setDisplayedResponse("");
        let currentIndex = 0;

        typingIntervalRef.current = setInterval(() => {
            if (currentIndex < response.length) {
                setDisplayedResponse(response.slice(0, currentIndex + 1));
                currentIndex++;
            } else {
                clearInterval(typingIntervalRef.current);
                setIsTyping(false);
            }
        }, 20);

        return () => {
            if (typingIntervalRef.current) {
                clearInterval(typingIntervalRef.current);
            }
        };
    }, [response]);

    const handleSend = async () => {
        if (!message.trim()) {
            toast.error("Digite uma mensagem");
            return;
        }

        setLoading(true);
        setResponse("");
        setDisplayedResponse("🤔 Analisando seus dados...");

        try {
            const result = await base44.functions.invoke('chatWithAI', {
                message: message,
                context: "Você é um consultor de oficinas mecânicas. Responda de forma prática e direta.",
                includeWorkshopData: includeData
            });

            // Aguarda 1 segundo simulando "pensamento"
            await new Promise(resolve => setTimeout(resolve, 1000));

            setResponse(result.data.response);
            setUsage(result.data.usage);
            toast.success("Resposta gerada!");
        } catch (error) {
            console.error(error);
            toast.error("Erro ao chamar IA: " + error.message);
            setDisplayedResponse("Erro ao processar sua pergunta.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-blue-600" />
                        Teste OpenAI - Chave Secundária
                    </CardTitle>
                    <p className="text-sm text-gray-600">
                        Esta página usa a função <code className="bg-gray-100 px-2 py-1 rounded">chatWithAI</code> que utiliza a OPENAI_API_KEY_SECONDARY
                    </p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Sua Pergunta:
                        </label>
                        <Textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Ex: Como aumentar o faturamento da minha oficina?"
                            rows={4}
                            className="w-full"
                        />
                    </div>

                    <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <input
                            type="checkbox"
                            id="includeData"
                            checked={includeData}
                            onChange={(e) => setIncludeData(e.target.checked)}
                            className="w-4 h-4"
                        />
                        <label htmlFor="includeData" className="text-sm cursor-pointer">
                            📊 Incluir dados da oficina (metas, DRE, diagnósticos, equipe)
                        </label>
                    </div>

                    <Button
                        onClick={handleSend}
                        disabled={loading || !message.trim()}
                        className="w-full"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Processando...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4 mr-2" />
                                Enviar para IA
                            </>
                        )}
                    </Button>

                    {(displayedResponse || isTyping) && (
                        <div className="mt-6">
                            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                                Resposta da IA:
                                {isTyping && (
                                    <span className="flex items-center gap-1 text-xs text-gray-500">
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        digitando...
                                    </span>
                                )}
                            </label>
                            <div className="bg-gray-50 border rounded-lg p-4">
                                <p className="whitespace-pre-wrap">
                                    {displayedResponse}
                                    {isTyping && <span className="inline-block w-0.5 h-4 bg-blue-600 ml-1 animate-pulse" />}
                                </p>
                            </div>

                            {usage && (
                                <div className="mt-2 text-xs text-gray-500">
                                    Tokens: {usage.total_tokens} (prompt: {usage.prompt_tokens}, resposta: {usage.completion_tokens})
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h3 className="font-semibold text-sm mb-2">💡 Como usar em outras páginas:</h3>
                        <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
{`const result = await base44.functions.invoke('chatWithAI', {
    message: "Sua pergunta aqui",
    context: "Contexto personalizado (opcional)"
});

console.log(result.data.response);`}
                        </pre>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}