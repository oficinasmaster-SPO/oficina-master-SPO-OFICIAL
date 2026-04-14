import React from "react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const TAB_BASE = "flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200";
const TAB_ACTIVE = "data-[state=active]:bg-[#FF0000] data-[state=active]:text-white data-[state=active]:shadow-md";
const TAB_HOVER = "hover:bg-gray-100 data-[state=active]:hover:bg-[#FF0000]";
export const RED_TAB_CLASS = `${TAB_BASE} ${TAB_ACTIVE} ${TAB_HOVER}`;

/**
 * RedTabsList
 * Container estilizado para as abas (fundo branco, borda arredondada e scroll horizontal)
 */
export function RedTabsList({ className, children, ...props }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1.5">
      <TabsList 
        className={cn("flex w-full justify-start overflow-x-auto bg-transparent h-auto gap-1 scrollbar-hide", className)} 
        {...props}
      >
        {children}
      </TabsList>
    </div>
  );
}

/**
 * RedTabsTrigger
 * Botão individual da aba com os efeitos de hover e estado ativo em vermelho
 */
export const RedTabsTrigger = React.forwardRef(({ className, children, ...props }, ref) => (
  <TabsTrigger
    ref={ref}
    className={cn(RED_TAB_CLASS, className)}
    {...props}
  >
    {children}
  </TabsTrigger>
));
RedTabsTrigger.displayName = "RedTabsTrigger";