import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Award, Star, Medal, Zap, Crown } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function RewardsWall({ rewards, employees }) {
  const iconMap = {
    trophy: Trophy,
    award: Award,
    star: Star,
    medal: Medal,
    zap: Zap,
    crown: Crown
  };

  const getEmployee = (userId) => {
    return employees.find(e => e.id === userId);
  };

  const recentRewards = rewards
    .filter(r => r.is_public)
    .sort((a, b) => new Date(b.awarded_date) - new Date(a.awarded_date))
    .slice(0, 10);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-600" />
          Mural de Reconhecimento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {recentRewards.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Trophy className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>Nenhuma conquista pública ainda</p>
          </div>
        ) : (
          recentRewards.map((reward, index) => {
            const employee = getEmployee(reward.user_id);
            const Icon = iconMap[reward.icon] || Award;
            
            return (
              <div
                key={reward.id}
                className={`p-4 rounded-lg border-2 ${
                  index === 0 
                    ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200'
                    : 'bg-white border-gray-200'
                } hover:shadow-md transition-all`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ background: reward.color || '#f59e0b' }}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-gray-900">{employee?.full_name || 'Colaborador'}</p>
                      <Badge variant="outline" className="text-xs">
                        {employee?.position}
                      </Badge>
                    </div>
                    <p className="font-medium text-gray-800 mb-1">{reward.title}</p>
                    <p className="text-sm text-gray-600 mb-2">{reward.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {reward.awarded_for}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-purple-100 text-purple-800">
                          +{reward.xp_earned} XP
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {format(new Date(reward.awarded_date), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}