import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useNavigate } from 'react-router-dom';

export default function LoginFake() {
    const { loginFake } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('admin@teste.com');
    const [password, setPassword] = useState('123456');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));

        loginFake({
            email,
            full_name: 'Usuário de Teste',
            role: 'admin',
            id: 'fake-user-123'
        });

        setLoading(false);
        navigate('/');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">Login de Teste</CardTitle>
                    <CardDescription className="text-center">
                        Ambiente de Homologação
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="seu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Senha</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <Button className="w-full" type="submit" disabled={loading}>
                            {loading ? 'Entrando...' : 'Entrar (Fake)'}
                        </Button>

                        <div className="text-xs text-center text-slate-500 mt-4">
                            * Qualquer senha funciona neste modo fake.
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
