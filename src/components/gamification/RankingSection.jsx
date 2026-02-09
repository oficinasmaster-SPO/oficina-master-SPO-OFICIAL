import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Medal, Star, TrendingUp, BookOpen, CalendarCheck, Users, Briefcase, Crown, Building2, Map, User, Target } from "lucide-react";

const STANDARD_AREAS = [
    { id: 'vendas', label: 'Vendas' },
    { id: 'comercial', label: 'Comercial' },
    { id: 'marketing', label: 'Marketing' },
    { id: 'tecnico', label: 'Técnico' },
    { id: 'administrativo', label: 'Administrativo' },
    { id: 'financeiro', label: 'Financeiro' },
    { id: 'gerencia', label: 'Gerência' }
];

export default function RankingSection({ internalRankings, nationalRankings, userEmployee, currentWorkshop }) {
    if (!internalRankings) return null;

    const [nationalFilter, setNationalFilter] = useState("geral");

    // Helper for Engagement Classification
    const getEngagementLevel = (score) => {
        if (score >= 1000) return { label: "Elite", color: "bg-purple-100 text-purple-800" };
        if (score >= 500) return { label: "Avançado", color: "bg-blue-100 text-blue-800" };
        if (score >= 200) return { label: "Engajado", color: "bg-green-100 text-green-800" };
        return { label: "Iniciante", color: "bg-gray-100 text-gray-800" };
    };

    // Generic Ranking Card
    const RankingCard = ({ title, items, icon: Icon, colorClass, emptyMessage, isNational }) => (
        <Card className="h-full hover:shadow-md transition-shadow border-none shadow-sm bg-white">
            <CardHeader className="pb-2 border-b border-gray-100 bg-gray-50/50 rounded-t-xl">
                <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${colorClass}`}>
                        <Icon className="w-5 h-5 text-white" />
                    </div>
                    <CardTitle className="text-lg text-gray-800">{title}</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="pt-4">
                <div className="space-y-3">
                    {items.map((item, index) => (
                        <div key={item.id || index} className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                            isNational && item.workshop_id === currentWorkshop?.id 
                                ? 'bg-blue-50 border-blue-200 shadow-sm' 
                                : 'bg-white border-gray-100 hover:border-blue-100 hover:bg-blue-50/30'
                        }`}>
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className={`w-7 h-7 flex items-center justify-center rounded-full font-bold text-xs flex-shrink-0 shadow-sm ${
                                    index === 0 ? 'bg-yellow-100 text-yellow-700 ring-2 ring-yellow-200' :
                                    index === 1 ? 'bg-gray-100 text-gray-700 ring-2 ring-gray-200' :
                                    index === 2 ? 'bg-orange-100 text-orange-700 ring-2 ring-orange-200' : 'bg-slate-50 text-slate-600'
                                }`}>
                                    {index + 1}º
                                </div>
                                <Avatar className="w-9 h-9 border-2 border-white shadow-sm flex-shrink-0">
                                    <AvatarImage src={item.employee?.profile_picture_url} />
                                    <AvatarFallback className="bg-blue-100 text-blue-700">{item.employee?.full_name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 leading-none truncate">
                                        {item.employee?.full_name}
                                        {isNational && item.workshop_id === currentWorkshop?.id && <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-1.5 rounded-full">Você/Sua Oficina</span>}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <p className="text-[11px] text-gray-500 capitalize truncate max-w-[100px]">{item.area}</p>
                                        {isNational && (
                                            <span className="text-[10px] text-gray-400 flex items-center gap-0.5 border-l pl-2 border-gray-200 truncate max-w-[120px]">
                                                <Building2 className="w-3 h-3" />
                                                {item.workshop_name}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right bg-gray-50 px-2 py-1 rounded-lg flex-shrink-0 ml-2">
                                <span className="text-sm font-bold text-gray-900">{item.total_score?.toFixed(0)}</span>
                                <p className="text-[9px] text-gray-500 font-medium uppercase">pts</p>
                            </div>
                        </div>
                    ))}
                    {items.length === 0 && <p className="text-sm text-gray-400 text-center py-8 italic">{emptyMessage || "Nenhum dado disponível"}</p>}
                </div>
            </CardContent>
        </Card>
    );

    const AreaLeadersCard = ({ leaders }) => (
        <Card className="h-full hover:shadow-md transition-shadow border-none shadow-sm bg-white">
            <CardHeader className="pb-2 border-b border-gray-100 bg-gray-50/50 rounded-t-xl">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-purple-500">
                        <Crown className="w-5 h-5 text-white" />
                    </div>
                    <CardTitle className="text-lg text-gray-800">Líderes por Área (Interno)</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="pt-4">
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                    {leaders.map((item) => (
                        <div key={item.areaLabel} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0 text-purple-600">
                                    <Briefcase className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-0.5">{item.areaLabel}</p>
                                    {item.leader ? (
                                        <div className="flex items-center gap-2">
                                            <Avatar className="w-5 h-5">
                                                <AvatarImage src={item.leader.employee?.profile_picture_url} />
                                                <AvatarFallback className="text-[9px]">{item.leader.employee?.full_name?.substring(0, 2)}</AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm font-medium text-gray-900 truncate">{item.leader.employee?.full_name}</span>
                                        </div>
                                    ) : (
                                        <span className="text-sm text-gray-400 italic">- Sem representante -</span>
                                    )}
                                </div>
                            </div>
                            {item.leader && (
                                <Badge variant="secondary" className="bg-yellow-50 text-yellow-700 border-yellow-100 text-[10px]">
                                    Top 1
                                </Badge>
                            )}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );

    const EngagementCard = ({ ranking }) => {
        const level = getEngagementLevel(ranking?.total_score || 0);
        return (
            <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none shadow-lg overflow-hidden relative">
                <div className="absolute top-0 right-0 p-20 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
                <CardHeader className="pb-2 relative z-10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-blue-200" />
                            <CardTitle className="text-lg text-white">Sua Performance</CardTitle>
                        </div>
                        <Badge className={`${level.color} border-none`}>{level.label}</Badge>
                    </div>
                </CardHeader>
                <CardContent className="relative z-10 pt-2">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl text-center border border-white/10">
                            <CalendarCheck className="w-5 h-5 text-blue-200 mx-auto mb-1" />
                            <p className="text-[10px] text-blue-100 uppercase tracking-wide">Registros</p>
                            <p className="text-xl font-bold text-white">{ranking?.daily_logs_count || 0}</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl text-center border border-white/10">
                            <BookOpen className="w-5 h-5 text-purple-200 mx-auto mb-1" />
                            <p className="text-[10px] text-blue-100 uppercase tracking-wide">Cursos</p>
                            <p className="text-xl font-bold text-white">{ranking?.trainings_completed || 0}</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl text-center border border-white/10">
                            <Star className="w-5 h-5 text-yellow-300 mx-auto mb-1" />
                            <p className="text-[10px] text-blue-100 uppercase tracking-wide">Média</p>
                            <p className="text-xl font-bold text-white">{ranking?.average_training_grade?.toFixed(1) || '-'}</p>
                        </div>
                    </div>
                    
                    <div className="mt-4 bg-black/20 rounded-lg p-3 flex items-center justify-between">
                         <span className="text-xs text-blue-100">Preenchimento diário</span>
                         <div className="h-2 w-24 bg-white/20 rounded-full overflow-hidden">
                            <div className="h-full bg-green-400 rounded-full" style={{ width: `${Math.min((ranking?.daily_logs_count || 0) * 5, 100)}%` }}></div>
                         </div>
                    </div>
                </CardContent>
            </Card>
        );
    };

    // INTERNAL DATA PROCESSING
    const myArea = userEmployee?.area;
    const internalTopGlobal = [...internalRankings].sort((a, b) => b.total_score - a.total_score).slice(0, 3);
    const internalTopArea = myArea 
        ? internalRankings.filter(r => r.area === myArea).sort((a, b) => b.total_score - a.total_score).slice(0, 3)
        : [];
    
    const internalLeadersByArea = STANDARD_AREAS.map(areaDef => {
        const areaRankings = internalRankings
            .filter(r => r.area === areaDef.id || r.area === areaDef.label || (r.area && r.area.toLowerCase() === areaDef.id))
            .sort((a, b) => b.total_score - a.total_score);
        return { areaLabel: areaDef.label, leader: areaRankings[0] || null };
    });
    
    const userRanking = internalRankings.find(r => r.employee_id === userEmployee?.id);

    // NATIONAL DATA PROCESSING
    const getNationalList = () => {
        if (nationalFilter === "oficinas") {
            // Aggregate by workshop
            const workshopStats = {};
            nationalRankings.forEach(rank => {
                if (!workshopStats[rank.workshop_id]) {
                    workshopStats[rank.workshop_id] = {
                        id: rank.workshop_id,
                        workshop_id: rank.workshop_id,
                        workshop_name: rank.workshop_name,
                        total_score: 0,
                        count: 0,
                        employee: { full_name: rank.workshop_name, profile_picture_url: null }, // Mock for UI
                        area: "Oficina"
                    };
                }
                workshopStats[rank.workshop_id].total_score += rank.total_score;
                workshopStats[rank.workshop_id].count += 1;
            });

            // Average score per workshop
            return Object.values(workshopStats)
                .map(ws => ({ ...ws, total_score: ws.total_score / ws.count }))
                .sort((a, b) => b.total_score - a.total_score)
                .slice(0, 10);
        }

        let filtered = [...nationalRankings];
        if (nationalFilter !== "geral") {
            filtered = filtered.filter(r => r.area === nationalFilter || (r.area && r.area.toLowerCase() === nationalFilter));
        }
        return filtered.sort((a, b) => b.total_score - a.total_score).slice(0, 10);
    };

    const nationalList = getNationalList();

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Engagement Card Always Visible */}
            {userRanking && (
                <div className="mb-6">
                    <EngagementCard ranking={userRanking} />
                </div>
            )}

            <Tabs defaultValue="interno" className="w-full">
                <div className="flex items-center justify-between mb-6">
                     <TabsList className="grid w-[400px] grid-cols-2 bg-gray-100 p-1 rounded-xl">
                        <TabsTrigger value="interno" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <Building2 className="w-4 h-4 mr-2" />
                            Ranking Interno
                        </TabsTrigger>
                        <TabsTrigger value="nacional" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <Map className="w-4 h-4 mr-2" />
                            Ranking Nacional
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="interno" className="mt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* 1. Top 3 My Area */}
                        <div className="h-full">
                            {myArea ? (
                                <RankingCard 
                                    title={`Top 3 - Minha Área (${myArea})`}
                                    items={internalTopArea}
                                    icon={Users} 
                                    colorClass="bg-blue-600"
                                    emptyMessage={`Seja o primeiro a pontuar em ${myArea}!`}
                                    isNational={false}
                                />
                            ) : (
                                <Card className="h-full flex items-center justify-center bg-gray-50 border-dashed border-2">
                                    <CardContent className="text-center py-10">
                                        <Briefcase className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                        <p className="text-gray-500">Complete seu cadastro para ver o ranking da sua área</p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {/* 2. Top 3 Internal Global */}
                        <div className="h-full">
                            <RankingCard 
                                title="Top 3 da Oficina (Geral)"
                                items={internalTopGlobal}
                                icon={Trophy}
                                colorClass="bg-yellow-500"
                                isNational={false}
                            />
                        </div>

                        {/* 3. Leaders by Area */}
                        <div className="h-full">
                            <AreaLeadersCard leaders={internalLeadersByArea} />
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="nacional" className="mt-0">
                     <div className="flex flex-col space-y-6">
                         {/* National Filters */}
                         <div className="flex items-center gap-2 bg-white p-3 rounded-xl shadow-sm border border-gray-100 w-fit">
                            <span className="text-sm font-medium text-gray-600 pl-2">Categoria:</span>
                            <Select value={nationalFilter} onValueChange={setNationalFilter}>
                                <SelectTrigger className="w-[200px] border-none shadow-none bg-gray-50 h-9">
                                    <SelectValue placeholder="Selecione a categoria" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="geral">Geral (Todos)</SelectItem>
                                    <SelectItem value="oficinas">🏆 Melhores Oficinas</SelectItem>
                                    <SelectItem value="tecnico">Técnicos</SelectItem>
                                    <SelectItem value="vendas">Vendas</SelectItem>
                                    <SelectItem value="gerencia">Gerentes</SelectItem>
                                    <SelectItem value="comercial">Comercial</SelectItem>
                                    <SelectItem value="administrativo">Administrativo</SelectItem>
                                </SelectContent>
                            </Select>
                         </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                             {/* Main National List */}
                            <div className="lg:col-span-2 h-full">
                                <RankingCard 
                                    title={
                                        nationalFilter === "geral" ? "Top 10 Nacional - Geral" :
                                        nationalFilter === "oficinas" ? "Top 10 Oficinas do Brasil" :
                                        `Top 10 Nacional - ${nationalFilter.charAt(0).toUpperCase() + nationalFilter.slice(1)}`
                                    }
                                    items={nationalList}
                                    icon={Map}
                                    colorClass="bg-indigo-600"
                                    isNational={true}
                                />
                            </div>

                            {/* My Position / Summary Card */}
                            <div className="space-y-6">
                                <Card className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white border-none">
                                    <CardHeader>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Target className="w-5 h-5 text-indigo-300" />
                                            Sua Posição Nacional
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-center py-4">
                                            <div className="text-4xl font-bold text-white mb-1">
                                                #{nationalRankings.filter(r => r.total_score > (userRanking?.total_score || 0)).length + 1}
                                            </div>
                                            <p className="text-indigo-200 text-sm">entre {nationalRankings.length} profissionais</p>
                                        </div>
                                        
                                        <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-indigo-200">Sua pontuação:</span>
                                                <span className="font-bold">{userRanking?.total_score?.toFixed(0) || 0}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-indigo-200">Média Nacional:</span>
                                                <span className="font-bold">
                                                    {(nationalRankings.reduce((acc, curr) => acc + curr.total_score, 0) / (nationalRankings.length || 1)).toFixed(0)}
                                                </span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
                                    <p className="font-bold mb-1 flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4" />
                                        Dica para subir:
                                    </p>
                                    <p>Mantenha a constância nos registros diários. Oficinas no Top 10 possuem média de 95% de preenchimento.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}