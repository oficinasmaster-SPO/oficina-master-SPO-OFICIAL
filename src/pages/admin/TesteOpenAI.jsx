import React, { useState, useEffect, useRef } from "react";
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Send, Sparkles, Paperclip, X } from "lucide-react";
import { toast } from "sonner";

export default function TesteOpenAI() {
    const [message, setMessage] = useState("");
    const [response, setResponse] = useState("");
    const [displayedResponse, setDisplayedResponse] = useState("");
    const [loading, setLoading] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [includeData, setIncludeData] = useState(true);
    const [usage, setUsage] = useState(null);
    const [attachedFiles, setAttachedFiles] = useState([]);
    const [uploadingFiles, setUploadingFiles] = useState(false);
    const typingIntervalRef = useRef(null);
    const fileInputRef = useRef(null);

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

    const handleFileSelect = async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        setUploadingFiles(true);
        try {
            const uploadedUrls = [];
            for (const file of files) {
                const { file_url } = await base44.integrations.Core.UploadFile({ file });
                uploadedUrls.push({
                    name: file.name,
                    url: file_url,
                    type: file.type
                });
            }
            setAttachedFiles([...attachedFiles, ...uploadedUrls]);
            toast.success(`${files.length} arquivo(s) anexado(s)`);
        } catch (error) {
            toast.error("Erro ao fazer upload: " + error.message);
        } finally {
            setUploadingFiles(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleRemoveFile = (index) => {
        setAttachedFiles(attachedFiles.filter((_, i) => i !== index));
    };

    const handleSend = async () => {
        if (!message.trim()) {
            toast.error("Digite uma mensagem");
            return;
        }

        setLoading(true);
        setResponse("");
        setDisplayedResponse("ðŸ¤” Analisando seus dados...");

        try {
            const result = await base44.functions.invoke('chatWithAI', {
                message: message,
                context: "VocÃª Ã© um consultor de oficinas mecÃ¢nicas. Responda de forma prÃ¡tica e direta.",
                includeWorkshopData: includeData,
                file_urls: attachedFiles.length > 0 ? attachedFiles.map(f => f.url) : undefined
            });

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
                        Teste OpenAI - Chave SecundÃ¡ria
                    </CardTitle>
                    <p className="text-sm text-gray-600">
                        Esta pÃ¡gina usa a funÃ§Ã£o <code className="bg-gray-100 px-2 py-1 rounded">chatWithAI</code> que utiliza a OPENAI_API_KEY_SECONDARY
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

                    <div className="space-y-3">
                        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <input
                                type="checkbox"
                                id="includeData"
                                checked={includeData}
                                onChange={(e) => setIncludeData(e.target.checked)}
                                className="w-4 h-4"
                            />
                            <label htmlFor="includeData" className="text-sm cursor-pointer">
                                ðŸ“Š Incluir dados da oficina (metas, DRE, diagnÃ³sticos, equipe)
                            </label>
                        </div>

                        <div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                onChange={handleFileSelect}
                                className="hidden"
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingFiles}
                                className="w-full"
                            >
                                {uploadingFiles ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Enviando...
                                    </>
                                ) : (
                                    <>
                                        <Paperclip className="w-4 h-4 mr-2" />
                                        Anexar Documentos (PDF, Excel, Word, Imagens)
                                    </>
                                )}
                            </Button>
                        </div>

                        {attachedFiles.length > 0 && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Arquivos Anexados:</label>
                                {attachedFiles.map((file, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between p-2 bg-gray-50 border rounded-lg"
                                    >
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <Paperclip className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                            <span className="text-sm truncate">{file.name}</span>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveFile(index)}
                                            className="p-1 hover:bg-red-100 rounded transition-colors"
                                        >
                                            <X className="w-4 h-4 text-red-600" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
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
                        <h3 className="font-semibold text-sm mb-2">ðŸ’¡ Como usar em outras pÃ¡ginas:</h3>
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



