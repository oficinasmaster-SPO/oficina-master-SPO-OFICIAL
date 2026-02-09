import React from "react";
import { Trophy, Crown, Medal, Star, Shield } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export default function WorkshopLevelBadge({ level, levelName, xp, className }) {
  const getLevelDetails = (lvlName) => {
    switch (lvlName) {
      case 'Elite Master':
        return { icon: Crown, color: 'from-purple-500 to-pink-600', textColor: 'text-purple-700', bgColor: 'bg-purple-50' };
      case 'Diamante':
        return { icon: Star, color: 'from-blue-400 to-cyan-500', textColor: 'text-cyan-700', bgColor: 'bg-cyan-50' };
      case 'Ouro':
        return { icon: Trophy, color: 'from-yellow-400 to-orange-500', textColor: 'text-yellow-700', bgColor: 'bg-yellow-50' };
      case 'Prata':
        return { icon: Medal, color: 'from-slate-300 to-slate-500', textColor: 'text-slate-700', bgColor: 'bg-slate-50' };
      case 'Bronze':
        return { icon: Shield, color: 'from-orange-700 to-yellow-800', textColor: 'text-orange-800', bgColor: 'bg-orange-50' };
      default:
        return { icon: Shield, color: 'from-gray-400 to-gray-500', textColor: 'text-gray-700', bgColor: 'bg-gray-50' };
    }
  };

  const details = getLevelDetails(levelName);
  const Icon = details.icon;

  // XP Calculation for progress (simplified for visual)
  // Level thresholds: 1: 0-1000, 2: 1000-3000, 3: 3000-6000, etc.
  const currentLevelBase = (level - 1) * 1000 * (level - 1); // rough exponential curve
  const nextLevelThreshold = level * 1000 * level;
  const progress = Math.min(Math.max(((xp - currentLevelBase) / (nextLevelThreshold - currentLevelBase)) * 100, 0), 100);

  return (
    <div className={cn(`relative overflow-hidden rounded-xl border-2 border-white shadow-lg ${details.bgColor}`, className)}>
      <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${details.color}`} />
      <div className="p-4 flex items-center gap-4">
        <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${details.color} flex items-center justify-center shadow-inner`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-end mb-1">
            <h3 className={`font-bold text-lg leading-none ${details.textColor}`}>
              {levelName || 'Iniciante'}
            </h3>
            <span className="text-xs font-medium text-gray-500">Nível {level || 1}</span>
          </div>
          
          <div className="w-full bg-white/50 rounded-full h-2 mb-1">
            <div 
              className={`h-full rounded-full bg-gradient-to-r ${details.color} transition-all duration-500`} 
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <p className="text-xs text-gray-500 text-right">
            {xp?.toLocaleString()} XP / {nextLevelThreshold?.toLocaleString()} XP
          </p>
        </div>
      </div>
    </div>
  );
}