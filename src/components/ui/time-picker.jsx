import React, { useState, useEffect, useRef } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEM_HEIGHT = 48; // 48px para melhor legibilidade/touch (padrão iOS premium)
const VISIBLE_ITEMS = 5; // Total de itens visíveis
const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const OFFSET = ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2);

const Wheel = ({ options, value, onChange }) => {
  const containerRef = useRef(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeout = useRef(null);

  // Set initial scroll position
  useEffect(() => {
    if (containerRef.current && !isScrolling) {
      const index = options.indexOf(value);
      if (index !== -1) {
        containerRef.current.scrollTop = index * ITEM_HEIGHT;
      }
    }
  }, [value, options, isScrolling]);

  const handleScroll = (e) => {
    setIsScrolling(true);
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    
    scrollTimeout.current = setTimeout(() => {
      setIsScrolling(false);
      const y = e.target.scrollTop;
      const index = Math.max(0, Math.min(options.length - 1, Math.round(y / ITEM_HEIGHT)));
      if (options[index] !== value) {
        onChange(options[index]);
      }
      // Snap exactly
      e.target.scrollTo({ top: index * ITEM_HEIGHT, behavior: 'smooth' });
    }, 150);
  };

  return (
    <div 
      className="relative overflow-hidden bg-white"
      style={{ height: `${CONTAINER_HEIGHT}px`, width: '70px' }}
    >
      {/* Top fade */}
      <div 
        className="absolute top-0 left-0 w-full bg-gradient-to-b from-white via-white/90 to-transparent z-10 pointer-events-none" 
        style={{ height: `${OFFSET}px` }} 
      />
      {/* Bottom fade */}
      <div 
        className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-white via-white/90 to-transparent z-10 pointer-events-none" 
        style={{ height: `${OFFSET}px` }} 
      />
      
      {/* Active selection band */}
      <div 
        className="absolute left-0 w-full z-10 pointer-events-none border-y border-red-500 bg-red-50/20" 
        style={{ top: `${OFFSET}px`, height: `${ITEM_HEIGHT}px` }} 
      />
      
      <div 
        ref={containerRef}
        className="h-full w-full overflow-y-auto snap-y snap-mandatory scroll-smooth"
        style={{ 
          paddingBottom: `${OFFSET}px`, 
          paddingTop: `${OFFSET}px`, 
          scrollbarWidth: 'none', 
          msOverflowStyle: 'none' 
        }}
        onScroll={handleScroll}
      >
        <style dangerouslySetInnerHTML={{__html: `::-webkit-scrollbar { display: none; }`}} />
        {options.map((opt) => {
          const isSelected = opt === value;
          return (
            <div 
              key={opt}
              style={{ height: `${ITEM_HEIGHT}px` }}
              className={cn(
                "flex items-center justify-center snap-center cursor-pointer transition-all duration-300 select-none",
                isSelected 
                  ? "text-[28px] font-bold text-gray-900 opacity-100 tracking-tight" 
                  : "text-xl font-medium text-gray-400 opacity-40 hover:opacity-70"
              )}
              onClick={() => {
                onChange(opt);
                if (containerRef.current) {
                  containerRef.current.scrollTo({
                    top: options.indexOf(opt) * ITEM_HEIGHT,
                    behavior: 'smooth'
                  });
                }
              }}
            >
              {opt}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const TimePicker = React.forwardRef(({ value, onChange, disabled, placeholder = "Selecione o horário", className }, ref) => {
  const [open, setOpen] = useState(false);
  
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  const [hour, setHour] = useState(value ? value.split(':')[0] : '00');
  const [minute, setMinute] = useState(value ? value.split(':')[1] : '00');

  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':');
      if (h) setHour(h);
      if (m) setMinute(m);
    }
  }, [value]);

  const handleHourChange = (h) => {
    setHour(h);
    const newValue = `${h}:${minute}`;
    if (onChange) onChange(newValue);
  };

  const handleMinuteChange = (m) => {
    setMinute(m);
    const newValue = `${hour}:${m}`;
    if (onChange) onChange(newValue);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={ref}
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal h-10 px-3 py-2 bg-white",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <Clock className="mr-2 h-4 w-4" />
          {value || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-5 bg-white shadow-2xl rounded-2xl border-gray-100" align="center">
        <div className="flex items-center justify-center gap-6 relative">
          <div className="flex flex-col items-center">
            <span className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-widest">Horas</span>
            <Wheel options={hours} value={hour} onChange={handleHourChange} />
          </div>
          
          <div className="text-4xl font-light text-gray-300 pb-1 mt-6 animate-pulse select-none">:</div>
          
          <div className="flex flex-col items-center">
            <span className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-widest">Minutos</span>
            <Wheel options={minutes} value={minute} onChange={handleMinuteChange} />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
});

TimePicker.displayName = "TimePicker";
export default TimePicker;