import React, { useState, useEffect, useRef } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEM_HEIGHT = 40; // 40px

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
    <div className="relative h-[200px] w-[60px] overflow-hidden bg-white rounded-md">
      {/* Top fade */}
      <div className="absolute top-0 left-0 w-full h-[80px] bg-gradient-to-b from-white via-white/80 to-transparent z-10 pointer-events-none" />
      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 w-full h-[80px] bg-gradient-to-t from-white via-white/80 to-transparent z-10 pointer-events-none" />
      {/* Active selection band (border red, matched with sidebar red usually text-red-600) */}
      <div className="absolute top-[80px] left-0 w-full h-[40px] border-y border-red-600 z-10 pointer-events-none" />
      
      <div 
        ref={containerRef}
        className="h-full w-full overflow-y-auto snap-y snap-mandatory scroll-smooth"
        style={{ paddingBottom: '80px', paddingTop: '80px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        onScroll={handleScroll}
      >
        <style dangerouslySetInnerHTML={{__html: `::-webkit-scrollbar { display: none; }`}} />
        {options.map((opt) => {
          const isSelected = opt === value;
          return (
            <div 
              key={opt}
              className={cn(
                "h-[40px] flex items-center justify-center snap-center cursor-pointer transition-all duration-300 select-none",
                isSelected 
                  ? "text-2xl font-bold text-gray-900 opacity-100 scale-110" 
                  : "text-lg font-medium text-gray-400 opacity-30 hover:opacity-60"
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
            "w-full justify-start text-left font-normal h-10 px-3 py-2",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <Clock className="mr-2 h-4 w-4" />
          {value || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4 bg-white" align="center">
        <div className="flex items-center justify-center gap-4 relative">
          <div className="flex flex-col items-center">
            <span className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Horas</span>
            <Wheel options={hours} value={hour} onChange={handleHourChange} />
          </div>
          
          <div className="text-2xl font-bold text-gray-400 pb-1 mt-6 animate-pulse">:</div>
          
          <div className="flex flex-col items-center">
            <span className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Minutos</span>
            <Wheel options={minutes} value={minute} onChange={handleMinuteChange} />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
});

TimePicker.displayName = "TimePicker";
export default TimePicker;