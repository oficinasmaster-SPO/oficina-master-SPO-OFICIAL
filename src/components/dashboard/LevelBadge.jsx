import React from "react";
import { Trophy, Award, Star, Crown, Zap, Gem } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const levelConfig = {
  1: { name: "Iniciante", icon: Award, color: "from-gray-400 to-gray-600", xpNeeded: 1000 },
  2: { name: "Bronze", icon: Trophy, color: "from-orange-500 to-orange-700", xpNeeded: 2500 },
  3: { name: "Prata", icon: Star, color: "from-gray-300 to-gray-500", xpNeeded: 5000 },
  4: { name: "Ouro", icon: Crown, color: "from-yellow-400 to-yellow-600", xpNeeded: 10000 },
  5: { name: "Diamante", icon: Gem, color: "from-cyan-400 to-blue-600", xpNeeded: 20000 },
  6: { name: "Elite Master", icon: Zap, color: "from-purple-500 to-pink-600", xpNeeded: 999999 }
};

export default function LevelBadge({ level = 1, xp = 0, compact = false }) {
  const config = levelConfig[level] || levelConfig[1];
  const Icon = config.icon;
  const nextLevel = levelConfig[level + 1];
  const progressPercentage = nextLevel 
    ? Math.min((xp / config.xpNeeded) * 100, 100)
    : 100;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className={cn(
          "w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center",
          config.color
        )}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">{config.name}</p>
          <p className="text-xs text-gray-600">Nível {level}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-gray-100">
      <div className="flex items-center gap-4 mb-4">
        <div className={cn(
          "w-20 h-20 rounded-full bg-gradient-to-br flex items-center justify-center shadow-lg",
          config.color
        )}>
          <Icon className="w-10 h-10 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-2xl font-bold text-gray-900">{config.name}</h3>
          <p className="text-gray-600">Nível {level}</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">XP Atual</span>
          <span className="font-bold text-gray-900">{xp.toLocaleString()}</span>
        </div>
        {nextLevel && (
          <>
            <Progress value={progressPercentage} className="h-3" />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Próximo nível: {nextLevel.name}</span>
              <span>{config.xpNeeded.toLocaleString()} XP</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}