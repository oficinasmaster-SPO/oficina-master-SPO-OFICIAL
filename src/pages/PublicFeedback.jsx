import React, { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Smile, Frown, Meh, Send, CheckCircle2, Loader2, Info } from "lucide-react";
import { toast } from "sonner";

const NpsButton = ({ value, selected, onClick }) => {
    let colorClass = "bg-gray-100 text-gray-700 hover:bg-gray-200";
    if (selected) {
        if (value >= 9) colorClass = "bg-green-500 hover:bg-green-600 text-white";
        else if (value >= 7) colorClass = "bg-yellow-500 hover:bg-yellow-600 text-white";
        else colorClass = "bg-red-500 hover:bg-red-600 text-white";
    }

    return (
        <button
            type="button"
            onClick={onClick}
            className={`w-10 h-10 rounded-full font-bold transition-all transform hover:scale-105 ${colorClass} ${selected ? 'ring-2 ring-offset-2 ring-gray-300' : ''}`}
        >
            {value}
        </button>
    );
};

const EmojiScale = ({ value, onChange }) => {
    const getEmoji = (score) => {
        if (score === null) return "😶";
        if (score <= 2) return "😭";
        if (score <= 4) return "😟";
        if (score <= 6) return "😐";
        if (score <= 8) return "🙂";
        return "😍";
    };

    return (
        <div className="space-y-3">
            <div className="flex justify-center mb-2">
                <span className="text-4xl transition-all transform animate-in fade-in zoom-in duration-300">
                    {getEmoji(value)}
                </span>
            </div>
            <div className="flex flex-wrap justify-center gap-1">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                    <button
                        key={score}
                        type="button"
                        onClick={() => onChange(score)}
                        className={`
                            w-8 h-8 rounded-full text-sm font-medium transition-all
                            ${value === score 
                                ? 'bg-indigo-600 text-white scale-110 shadow-md' 
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
                        `}
                    >
                        {score}
                    </button>
                ))}
            </div>
            <div className="flex justify-between px-4 text-xs text-gray-400">
                <span>Não foi claro</span>
                <span>Extremamente claro</span>
            </div>
        </div>
    );
};

export default function PublicFeedback() {
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [urlParams, setUrlParams] = useState({});
    
    const [formData, setFormData] = useState({
        nps_score: null,
        sales_service_clarity_score: null,
        comment: "",
        customer_name: "",
        customer_phone: "",
        area: "geral"
    });

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const wid = params.get("wid");
        const eid = params.get("eid");
        const name = params.get("n");
        const phone = params.get("p");
        const area = params.get("a");

        setUrlParams({
            workshop_id: wid,
            employee_id: eid
        });

        setFormData(prev => ({
            ...prev,
            customer_name: name || "",
            customer_phone: phone || "",
            area: area || "geral"
        }));
    }, []);

    const submitMutation = useMutation({
        mutationFn: async (data) => {
            // Using backend function for public submission
            const response = await base44.functions.invoke('submitFeedback', data);
            if (response.data?.error) throw new Error(response.data.error);
            return response.data;
        },
        onSuccess: () => {
            setSubmitted(true);
            setLoading(false);
        },
        onError: (error) => {
            console.error("Error submitting feedback:", error);
            toast.error("Erro ao enviar avaliação. Tente novamente.");
            setLoading(false);
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!urlParams.workshop_id) {
            toast.error("Link inválido (Oficina não identificada).");
            return;
        }
        if (formData.nps_score === null) {
            toast.error("Por favor, selecione uma nota de 0 a 10.");
            return;
        }

        setLoading(true);
        submitMutation.mutate({
            ...formData,
            workshop_id: urlParams.workshop_id,
            employee_id: urlParams.employee_id
        });
    };

    if (submitted) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-md shadow-xl border-t-4 border-t-green-500">
                    <CardContent className="pt-8 text-center space-y-4">
                        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="w-8 h-8 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800">Obrigado!</h2>
                        <p className="text-gray-600">
                            Sua avaliação foi recebida com sucesso. 
                            Valorizamos muito sua opinião para melhorarmos nossos serviços.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!urlParams.workshop_id && !loading) { 
        // Simple check, effect runs after render so initially empty but that's fine for a split second
        // or we can show a skeleton. Better to show form only if we have params or after mount.
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg shadow-xl">
                <CardHeader className="text-center border-b bg-white rounded-t-xl pb-6">
                    <CardTitle className="text-2xl font-bold text-gray-800">Pesquisa de Satisfação</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Como você avaliaria sua experiência conosco?
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        
                        <div className="space-y-3">
                            <Label className="text-base font-semibold text-center block">
                                De 0 a 10, o quanto você nos recomendaria para um amigo?
                            </Label>
                            <div className="flex flex-wrap justify-center gap-2">
                                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                                    <NpsButton 
                                        key={score} 
                                        value={score} 
                                        selected={formData.nps_score === score}
                                        onClick={() => setFormData({ ...formData, nps_score: score })}
                                    />
                                ))}
                            </div>
                            <div className="flex justify-between px-2 text-xs text-gray-500 font-medium">
                                <span>Não recomendaria</span>
                                <span>Com certeza recomendaria</span>
                            </div>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 space-y-3">
                            <Label className="text-base font-semibold text-center block text-blue-900">
                                Vendas - Atendimento e as informações sobre o serviço foram claras?
                            </Label>
                            <EmojiScale 
                                value={formData.sales_service_clarity_score}
                                onChange={(val) => setFormData({...formData, sales_service_clarity_score: val})}
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="customer_name">Seu Nome (Opcional)</Label>
                                <Input 
                                    id="customer_name"
                                    value={formData.customer_name}
                                    onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
                                    placeholder="Digite seu nome"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="customer_phone">Seu WhatsApp (Opcional)</Label>
                                <Input 
                                    id="customer_phone"
                                    value={formData.customer_phone}
                                    onChange={(e) => setFormData({...formData, customer_phone: e.target.value})}
                                    placeholder="(XX) XXXXX-XXXX"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="comment">Deixe um comentário (Opcional)</Label>
                            <Textarea 
                                id="comment"
                                value={formData.comment}
                                onChange={(e) => setFormData({...formData, comment: e.target.value})}
                                placeholder="Conte-nos mais sobre sua experiência..."
                                className="min-h-[100px]"
                            />
                        </div>

                        <Button 
                            type="submit" 
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white h-12 text-lg font-semibold shadow-md"
                            disabled={loading}
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            ) : (
                                <Send className="w-5 h-5 mr-2" />
                            )}
                            Enviar Avaliação
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}