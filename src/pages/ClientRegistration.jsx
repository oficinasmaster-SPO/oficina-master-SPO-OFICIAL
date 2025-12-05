import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, User, Phone } from "lucide-react";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";

export default function ClientRegistration() {
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        phone: ""
    });

    const workshopId = searchParams.get("wid");
    const employeeId = searchParams.get("eid");
    const area = searchParams.get("a");

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.phone) {
            toast.error("Por favor, preencha todos os campos.");
            return;
        }

        if (!workshopId) {
            toast.error("Link inválido: Oficina não identificada.");
            return;
        }

        setLoading(true);
        try {
            // Create Client
            await base44.entities.Client.create({
                name: formData.name,
                phone: formData.phone,
                workshop_id: workshopId
            });

            // Redirect to PublicFeedback
            const feedbackUrl = createPageUrl("PublicFeedback");
            const params = new URLSearchParams();
            if (workshopId) params.append("wid", workshopId);
            if (employeeId) params.append("eid", employeeId);
            if (area) params.append("a", area);
            params.append("n", formData.name);
            params.append("p", formData.phone);

            window.location.href = `${feedbackUrl}?${params.toString()}`;
        } catch (error) {
            console.error(error);
            toast.error("Erro ao cadastrar. Tente novamente.");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-xl">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold text-gray-800">Bem-vindo!</CardTitle>
                    <CardDescription>
                        Por favor, identifique-se para continuar para a avaliação.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nome Completo</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="pl-10"
                                    placeholder="Seu nome"
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Telefone / WhatsApp</Label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                                <Input
                                    id="phone"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="pl-10"
                                    placeholder="(XX) XXXXX-XXXX"
                                    required
                                />
                            </div>
                        </div>
                        <Button 
                            type="submit" 
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Continuar para Avaliação
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}