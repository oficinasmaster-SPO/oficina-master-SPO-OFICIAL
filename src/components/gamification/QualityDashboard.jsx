import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Smile, Frown, Meh, Plus, TrendingUp, Phone, User, Star, Link as LinkIcon, Copy, Share2 } from "lucide-react";
import { toast } from "sonner";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line, CartesianGrid } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { createPageUrl } from "@/utils";

const areaOptions = [
    { value: "geral", label: "Geral" },
    { value: "vendas", label: "Vendas" },
    { value: "comercial", label: "Comercial" },
    { value: "tecnico", label: "Técnico" },
    { value: "administrativo", label: "Administrativo" },
    { value: "financeiro", label: "Financeiro" },
    { value: "gerencia", label: "Gerência" }
];

const NpsScoreInput = ({ value, onChange, disabled }) => {
    const getMoodIcon = (score) => {
        if (score >= 9) return <Smile className="w-5 h-5 text-green-500" />;
        if (score >= 7) return <Meh className="w-5 h-5 text-yellow-500" />;
        if (score < 7 && score !== null) return <Frown className="w-5 h-5 text-red-500" />;
        return null;
    };

    return (
        <div className="flex items-center gap-2 flex-wrap">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(score => (
                <Button
                    key={score}
                    variant={value === score ? "default" : "outline"}
                    size="sm"
                    type="button"
                    onClick={() => onChange(score)}
                    disabled={disabled}
                    className={
                        `w-9 h-9 p-0 rounded-full transition-all 
                        ${value === score ? 
                            (score >= 9 ? 'bg-green-500 hover:bg-green-600 text-white' : 
                            score >= 7 ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : 
                            'bg-red-500 hover:bg-red-600 text-white') 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`
                    }
                >
                    {score}
                </Button>
            ))}
            {getMoodIcon(value)}
        </div>
    );
};

export default function QualityDashboard({ workshopId, employees }) {
    const queryClient = useQueryClient();
    const [linkDialog, setLinkDialog] = useState(false);
    const [linkConfig, setLinkConfig] = useState({ employee_id: "all", area: "geral" });
    const [feedbackForm, setFeedbackForm] = useState({
        customer_name: "",
        customer_phone: "",
        nps_score: null,
        comment: "",
        area: "geral",
        employee_id: ""
    });

    const { data: feedbacks = [], isLoading: isLoadingFeedbacks } = useQuery({
        queryKey: ['customer-feedbacks', workshopId],
        queryFn: async () => {
            if (!workshopId) return [];
            const result = await base44.entities.CustomerFeedback.filter({ workshop_id: workshopId });
            return Array.isArray(result) ? result.sort((a,b) => new Date(b.created_date) - new Date(a.created_date)) : [];
        },
        enabled: !!workshopId
    });

    const createFeedbackMutation = useMutation({
        mutationFn: (newFeedback) => base44.entities.CustomerFeedback.create(newFeedback),
        onSuccess: () => {
            queryClient.invalidateQueries(['customer-feedbacks']);
            toast.success("Feedback registrado com sucesso!");
            setFeedbackForm({
                customer_name: "", customer_phone: "", nps_score: null, comment: "", area: "geral", employee_id: ""
            });
        },
        onError: (e) => {
            console.error("Error creating feedback:", e);
            toast.error("Erro ao registrar feedback.");
        }
    });

    const handleFormChange = (field, value) => {
        setFeedbackForm(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmitFeedback = (e) => {
        e.preventDefault();
        if (feedbackForm.nps_score === null) {
            toast.error("Por favor, selecione uma pontuação NPS.");
            return;
        }
        createFeedbackMutation.mutate({ ...feedbackForm, workshop_id: workshopId });
    };

    // Generate Share Link
    const generateShareLink = () => {
        const baseUrl = window.location.origin + createPageUrl("PublicFeedback");
        const params = new URLSearchParams();
        params.append("wid", workshopId);
        if (linkConfig.employee_id && linkConfig.employee_id !== "all") {
            params.append("eid", linkConfig.employee_id);
        }
        if (linkConfig.area && linkConfig.area !== "geral") {
            params.append("a", linkConfig.area);
        }
        return `${baseUrl}?${params.toString()}`;
    };

    const copyToClipboard = () => {
        const link = generateShareLink();
        navigator.clipboard.writeText(link);
        toast.success("Link copiado para a área de transferência!");
    };

    // NPS Calculation
    const promoters = feedbacks.filter(f => f.nps_score >= 9).length;
    const passives = feedbacks.filter(f => f.nps_score >= 7 && f.nps_score <= 8).length;
    const detractors = feedbacks.filter(f => f.nps_score <= 6).length;
    const totalResponses = feedbacks.length;

    const nps = totalResponses === 0 ? 0 : ((promoters - detractors) / totalResponses) * 100;

    const npsCategory = nps >= 50 ? "Excelente" : nps >= 0 ? "Bom" : "Precisa Melhorar";
    const npsColor = nps >= 50 ? "text-green-600" : nps >= 0 ? "text-yellow-600" : "text-red-600";

    return (
        <div className="space-y-6">
            {/* Top Actions Bar */}
            <div className="flex justify-end">
                <Dialog open={linkDialog} onOpenChange={setLinkDialog}>
                    <DialogTrigger asChild>
                        <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-md">
                            <Share2 className="w-4 h-4 mr-2" />
                            Gerar Link para Cliente
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Link de Pesquisa de Satisfação</DialogTitle>
                            <DialogDescription>
                                Envie este link para seus clientes avaliarem o serviço. As respostas cairão automaticamente aqui.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Vincular a um Colaborador (Opcional)</Label>
                                <Select 
                                    value={linkConfig.employee_id} 
                                    onValueChange={(v) => setLinkConfig({...linkConfig, employee_id: v})}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Nenhum / Geral</SelectItem>
                                        {employees.map(emp => (
                                            <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div className="space-y-2">
                                <Label>Área Padrão</Label>
                                <Select 
                                    value={linkConfig.area} 
                                    onValueChange={(v) => setLinkConfig({...linkConfig, area: v})}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {areaOptions.map(opt => (
                                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Input readOnly value={generateShareLink()} className="bg-gray-50 font-mono text-xs" />
                                <Button size="icon" onClick={copyToClipboard}>
                                    <Copy className="w-4 h-4" />
                                </Button>
                            </div>
                            <p className="text-xs text-gray-500 text-center">
                                Dica: Envie este link pelo WhatsApp ao finalizar um serviço.
                            </p>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xl flex items-center gap-2">
                            <TrendingUp className="w-5 h-5" /> NPS Geral
                        </CardTitle>
                        <CardDescription className="text-blue-200">Net Promoter Score</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center py-6">
                        <p className={`text-6xl font-bold ${npsColor} bg-white/10 px-4 rounded-lg backdrop-blur-sm`}>{nps.toFixed(0)}</p>
                        <p className="text-blue-100 text-lg mt-2">({npsCategory})</p>
                        <p className="text-blue-200 text-sm mt-1">{totalResponses} respostas</p>
                    </CardContent>
                </Card>

                <Card className="shadow-lg">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Distribuição NPS</CardTitle>
                    </CardHeader>
                    <CardContent className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[{ name: 'Promotores', value: promoters, color: '#22C55E' }, { name: 'Passivos', value: passives, color: '#EAB308' }, { name: 'Detratores', value: detractors, color: '#EF4444' }]}>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
                                <YAxis hide />
                                <Tooltip cursor={{fill: 'transparent'}} formatter={(value) => [`${value} (${totalResponses > 0 ? (value/totalResponses*100).toFixed(1) : 0}%)`, 'Qtd']} />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]} >
                                    {[{ name: 'Promotores', value: promoters, color: '#22C55E' }, { name: 'Passivos', value: passives, color: '#EAB308' }, { name: 'Detratores', value: detractors, color: '#EF4444' }].map((entry, index) => (
                                        <Bar key={`bar-${index}`} fill={entry.color} dataKey="value" />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="shadow-lg border-2 border-green-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-green-700 text-base">
                            <Plus className="w-4 h-4" /> Registro Manual
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmitFeedback} className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <Input
                                    placeholder="Nome Cliente"
                                    value={feedbackForm.customer_name}
                                    onChange={(e) => handleFormChange('customer_name', e.target.value)}
                                    required
                                    className="text-sm"
                                />
                                <Input
                                    placeholder="Telefone"
                                    value={feedbackForm.customer_phone}
                                    onChange={(e) => handleFormChange('customer_phone', e.target.value)}
                                    className="text-sm"
                                />
                            </div>
                            <div className="flex justify-center py-1">
                                <NpsScoreInput 
                                    value={feedbackForm.nps_score}
                                    onChange={(score) => handleFormChange('nps_score', score)}
                                    disabled={createFeedbackMutation.isPending}
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button type="submit" size="sm" disabled={createFeedbackMutation.isPending || feedbackForm.nps_score === null} className="w-full bg-green-600 hover:bg-green-700">
                                    {createFeedbackMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Salvar"}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>

            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Star className="w-5 h-5 text-yellow-500" /> Feedbacks Recentes
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoadingFeedbacks ? (
                        <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
                    ) : feedbacks.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">Nenhum feedback registrado ainda. Gere um link e envie para seus clientes!</p>
                    ) : (
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                            {feedbacks.map(feedback => (
                                <div key={feedback.id} className="p-4 border rounded-lg bg-white hover:shadow-sm transition-shadow">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="font-bold text-gray-800 flex items-center gap-2">
                                                {feedback.customer_name || "Cliente Anônimo"}
                                                {feedback.customer_phone && <span className="text-xs font-normal text-gray-500">({feedback.customer_phone})</span>}
                                            </p>
                                            <p className="text-xs text-gray-500">{new Date(feedback.created_date).toLocaleDateString('pt-BR')} às {new Date(feedback.created_date).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</p>
                                        </div>
                                        <div className={`flex flex-col items-end`}>
                                            <span className={`text-lg font-bold px-3 py-1 rounded-lg ${feedback.nps_score >= 9 ? 'bg-green-100 text-green-800' : feedback.nps_score >= 7 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                                                {feedback.nps_score}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {feedback.comment && (
                                        <div className="bg-gray-50 p-3 rounded-md mt-2 text-sm text-gray-700 italic border-l-4 border-gray-300">
                                            "{feedback.comment}"
                                        </div>
                                    )}
                                    
                                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-3 pt-2 border-t border-gray-100">
                                        <span className="flex items-center gap-1">
                                            <TrendingUp className="w-3 h-3" /> 
                                            Área: {areaOptions.find(a => a.value === feedback.area)?.label || feedback.area}
                                        </span>
                                        {feedback.employee_id && (
                                            <span className="flex items-center gap-1">
                                                <User className="w-3 h-3" />
                                                Colab: {employees.find(e => e.id === feedback.employee_id)?.full_name || '...'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}