import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Check, Loader2, ArrowRight, Sparkles } from "lucide-react";
import { createPageUrl } from "@/utils";
import { motion, useScroll, useTransform } from "framer-motion";

const Particles = () => {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    setDimensions({ width: window.innerWidth, height: window.innerHeight });
    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (dimensions.width === 0) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
      {[...Array(30)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-amber-300 rounded-full blur-[1px]"
          initial={{
            x: Math.random() * dimensions.width,
            y: Math.random() * dimensions.height,
            scale: Math.random() * 1 + 0.5,
          }}
          animate={{
            y: [null, Math.random() * -300 - 100],
            x: [null, (Math.random() - 0.5) * 100],
            opacity: [0, 0.8, 0],
          }}
          transition={{
            duration: Math.random() * 20 + 15,
            repeat: Infinity,
            ease: "linear",
            delay: Math.random() * 10,
          }}
        />
      ))}
    </div>
  );
};

export default function BemVindoPlanos() {
  const [user, setUser] = useState(null);
  const [isAnnual, setIsAnnual] = useState(false);
  const containerRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const planetY = useTransform(scrollYProgress, [0, 1], ["60%", "10%"]);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['planFeaturesPublicWelcome'],
    queryFn: () => base44.entities.PlanFeature.filter({ active: true })
  });

  const handleSelectPlan = (plan) => {
    const checkoutUrl = isAnnual ? plan.kiwify_checkout_url_annual : plan.kiwify_checkout_url_monthly;
    if (checkoutUrl) {
        window.open(checkoutUrl, "_blank");
    }
    window.location.href = createPageUrl("Home");
  };

  const handleSkip = () => {
    window.location.href = createPageUrl("Home");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020617]">
        <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            <p className="text-gray-400 font-medium">Preparando o ambiente...</p>
        </div>
      </div>
    );
  }

  const sortedPlans = [...plans].sort((a, b) => (a.order || 0) - (b.order || 0));

  const displayPlans = sortedPlans.length > 0 ? sortedPlans : [
    {
      id: "free",
      plan_name: "Free",
      plan_description: "O essencial para oficinas iniciantes.",
      price_monthly: 0,
      price_annual: 0,
      features_highlights: ["Acesso básico ao sistema", "Gestão de 1 usuário", "Dashboards simples", "Suporte da comunidade"],
      is_popular: false
    },
    {
      id: "growth",
      plan_name: "Growth",
      plan_description: "Para oficinas em crescimento que buscam organizar o caos.",
      price_monthly: 197,
      price_annual: 1890,
      features_highlights: ["Tudo do Free", "Diagnósticos Ilimitados", "Gestão Financeira e OS", "Suporte prioritário via WhatsApp", "Acesso a relatórios e KPIs"],
      is_popular: true,
      badge_text: "Mais Escolhido"
    },
    {
      id: "pro",
      plan_name: "Millions",
      plan_description: "Controle total para multi-unidades e alta performance.",
      price_monthly: 497,
      price_annual: 4770,
      features_highlights: ["Tudo do Growth", "Multi Unidades", "Integrações via API", "Atendimento exclusivo com especialista", "Treinamentos e Academias ilimitados"],
      is_popular: false,
      is_millions: true
    }
  ];

  return (
    <div ref={containerRef} className="relative min-h-screen flex flex-col items-center py-20 px-4 font-sans text-gray-200 overflow-hidden bg-[#020617] selection:bg-amber-500/30 selection:text-amber-200 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {/* Background Animated Gradient & Noise */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>
      
      {/* Single Planet Horizon Effect */}
      <motion.div 
        className="fixed left-1/2 -translate-x-1/2 w-[150vw] md:w-[130vw] aspect-square rounded-full pointer-events-none mix-blend-screen"
        style={{ 
          top: planetY,
          background: 'radial-gradient(ellipse at 50% 0%, rgba(245, 158, 11, 0.4) 0%, rgba(180, 83, 9, 0.2) 30%, transparent 70%)',
          boxShadow: '0 -30px 100px -10px rgba(245, 158, 11, 0.6), inset 0 40px 100px -20px rgba(245, 158, 11, 0.8)',
          borderTop: '2px solid rgba(253, 230, 138, 0.3)'
        }}
      />

      <Particles />

      {/* Content */}
      <div className="relative z-10 w-full flex flex-col items-center">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center max-w-4xl mb-12"
        >
          <div className="mb-10 flex justify-center">
            <img 
              src="https://media.base44.com/images/public/69540822472c4a70b54d47aa/121a4c254_Horizontal_Fundo_Claro.png" 
              alt="Oficinas Master" 
              className="h-24 object-contain brightness-0 invert drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]"
            />
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white mb-6 tracking-tight leading-tight">
            Evolua sua oficina <br className="hidden md:block"/> para o próximo <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 drop-shadow-sm">nível</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto font-light leading-relaxed">
            Escolha o plano ideal para a sua estrutura. Comece agora e tenha controle total, do pátio ao financeiro.
          </p>
        </motion.div>

        {/* Toggle */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex items-center bg-white/5 backdrop-blur-xl border border-white/10 p-1.5 rounded-full mb-20 shadow-2xl"
        >
          <button
            onClick={() => setIsAnnual(false)}
            className={`px-8 py-3 rounded-full text-sm font-semibold transition-all duration-300 ${!isAnnual ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
          >
            Mensal
          </button>
          <button
            onClick={() => setIsAnnual(true)}
            className={`px-8 py-3 rounded-full text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${isAnnual ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
          >
            Anual 
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ml-1 transition-colors ${isAnnual ? 'bg-amber-100 text-amber-800' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
              -20%
            </span>
          </button>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl w-full px-4 md:px-0">
          {displayPlans.map((plan, index) => {
            const isPopular = plan.is_popular;
            const isMillions = plan.is_millions || plan.plan_name?.toLowerCase() === 'millions';
            return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.15 + 0.3 }}
              className="flex h-full w-full"
            >
              {/* Inject keyframes for Millions card */}
              {isMillions && (
                <style>{`
                  @keyframes gold-shimmer {
                    0% { background-position: -200% center; }
                    100% { background-position: 200% center; }
                  }
                  @keyframes gold-shimmer-btn {
                    0% { background-position: -300% center; }
                    100% { background-position: 300% center; }
                  }
                  .millions-title {
                    background: linear-gradient(90deg, #b8860b 0%, #ffd700 30%, #fffacd 50%, #ffd700 70%, #b8860b 100%);
                    background-size: 200% auto;
                    -webkit-background-clip: text;
                    background-clip: text;
                    -webkit-text-fill-color: transparent;
                    animation: gold-shimmer 3s linear infinite;
                  }
                  .millions-btn-text {
                    background: linear-gradient(90deg, #7a5800 0%, #ffd700 25%, #fffacd 50%, #ffd700 75%, #7a5800 100%);
                    background-size: 300% auto;
                    -webkit-background-clip: text;
                    background-clip: text;
                    -webkit-text-fill-color: transparent;
                    animation: gold-shimmer-btn 6s linear infinite;
                  }
                  .millions-btn:hover .millions-btn-text {
                    animation: gold-shimmer-btn 1.5s linear infinite;
                  }
                `}</style>
              )}

              <div className={`group relative w-full flex flex-col transition-all duration-500 rounded-3xl backdrop-blur-xl hover:-translate-y-2
                ${isMillions
                  ? 'bg-gradient-to-br from-[#1a1200]/80 via-[#2a1f00]/60 to-[#1a1200]/80 border border-yellow-600/40 shadow-[0_0_50px_-10px_rgba(212,175,55,0.35)] hover:shadow-[0_0_80px_-10px_rgba(212,175,55,0.55)] hover:border-yellow-500/60'
                  : isPopular 
                    ? 'bg-white/[0.02] border border-amber-500/40 shadow-[0_0_40px_-10px_rgba(245,158,11,0.3)] z-10 md:scale-105 hover:shadow-[0_0_60px_-10px_rgba(245,158,11,0.4)]' 
                    : 'bg-white/[0.02] border border-white/10 shadow-2xl hover:border-white/20 hover:shadow-[0_0_30px_-10px_rgba(255,255,255,0.1)]'
                }`}
              >
                {/* Millions: subtle gold inner glow overlay */}
                {isMillions && (
                  <div className="absolute inset-0 rounded-3xl pointer-events-none"
                    style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.08) 0%, transparent 70%)' }}
                  />
                )}

                {/* Gradient Stroke Overlay (subtle) */}
                {!isMillions && (
                  <div className={`absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none border border-transparent ${isPopular ? 'bg-[linear-gradient(to_bottom,transparent,rgba(245,158,11,0.5),transparent)]' : 'bg-[linear-gradient(to_bottom,transparent,rgba(255,255,255,0.2),transparent)]'} [mask-image:linear-gradient(white,white)] [mask-composite:exclude]`}></div>
                )}

                {isPopular && !isMillions && (
                  <div className="absolute -top-4 left-0 right-0 flex justify-center">
                    <span className="flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-amber-600 text-black text-xs font-black py-1.5 px-5 rounded-full shadow-[0_0_20px_rgba(245,158,11,0.5)] tracking-widest uppercase">
                      <Sparkles className="w-3.5 h-3.5" />
                      {plan.badge_text || 'Recomendado'}
                    </span>
                  </div>
                )}

                {isMillions && (
                  <div className="absolute -top-4 left-0 right-0 flex justify-center">
                    <span className="flex items-center gap-1.5 text-xs font-black py-1.5 px-5 rounded-full tracking-widest uppercase"
                      style={{ background: 'linear-gradient(90deg, #b8860b, #ffd700, #fffacd, #ffd700, #b8860b)', backgroundSize: '200% auto', animation: 'gold-shimmer 3s linear infinite', color: '#1a0f00', boxShadow: '0 0 20px rgba(212,175,55,0.6)' }}>
                      <Sparkles className="w-3.5 h-3.5" />
                      Plano Elite
                    </span>
                  </div>
                )}
                
                <div className="p-8 md:p-10 flex flex-col h-full relative z-10">
                  <div className="mb-8">
                    {isMillions ? (
                      <h3 className="text-2xl font-bold mb-3 millions-title">{plan.plan_name}</h3>
                    ) : (
                      <h3 className={`text-2xl font-bold mb-3 ${isPopular ? 'text-amber-400' : 'text-white'}`}>{plan.plan_name}</h3>
                    )}
                    <p className="text-gray-400 text-sm min-h-[40px] leading-relaxed font-light">{plan.plan_description}</p>
                  </div>

                  <div className={`mb-8 pb-8 border-b ${isMillions ? 'border-yellow-600/20' : 'border-white/10'}`}>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-2xl font-semibold ${isMillions ? 'text-yellow-600/70' : 'text-gray-500'}`}>R$</span>
                      <span className={`text-5xl md:text-6xl font-extrabold tracking-tight ${isMillions ? 'text-yellow-200/90' : 'text-white'} ${isMillions ? 'millions-title' : ''}`}>
                         {isAnnual ? (plan.price_annual || 0) : (plan.price_monthly || 0)}
                      </span>
                    </div>
                    <span className={`text-sm font-medium mt-2 inline-block ${isMillions ? 'text-yellow-600/70' : 'text-gray-500'}`}>
                      / {isAnnual ? 'ano' : 'mês'} faturado {isAnnual ? 'anualmente' : 'mensalmente'}
                    </span>
                  </div>
                  
                  <div className="flex-1 flex flex-col">
                    <ul className="space-y-4 mb-8">
                      {plan.features_highlights?.slice(0, 5).map((highlight, idx) => (
                        <li key={idx} className="flex items-start gap-4">
                          <div className={`mt-1 shrink-0 p-1 rounded-full ${isMillions ? 'bg-yellow-500/20' : isPopular ? 'bg-amber-500/20' : 'bg-white/10'}`}>
                            <Check className={`w-3.5 h-3.5 ${isMillions ? 'text-yellow-400' : isPopular ? 'text-amber-400' : 'text-gray-300'}`} strokeWidth={3} />
                          </div>
                          <span className={`text-sm leading-relaxed ${isMillions ? 'text-yellow-100/80' : 'text-gray-300'}`}>{highlight}</span>
                        </li>
                      ))}
                    </ul>
                    
                    {plan.features_highlights?.length > 5 ? (
                      <Dialog>
                        <DialogTrigger asChild>
                          <button className={`text-sm font-semibold mb-8 flex items-center transition-colors text-left w-full ${isMillions ? 'text-yellow-500 hover:text-yellow-300' : isPopular ? 'text-amber-400 hover:text-amber-300' : 'text-gray-400 hover:text-white'}`}>
                            Ver todos os {plan.features_highlights.length} recursos <ArrowRight className="w-4 h-4 ml-2" />
                          </button>
                        </DialogTrigger>
                        <DialogContent className="bg-[#0f172a]/95 backdrop-blur-2xl border border-white/10 text-white sm:max-w-md shadow-2xl">
                          <DialogHeader>
                            <DialogTitle className="text-2xl font-bold mb-2">Recursos - {plan.plan_name}</DialogTitle>
                          </DialogHeader>
                          <div className="max-h-[60vh] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                            <ul className="space-y-4 py-2">
                              {plan.features_highlights.map((highlight, idx) => (
                                <li key={idx} className="flex items-start gap-4">
                                  <div className="mt-1 shrink-0 bg-white/10 p-1 rounded-full">
                                    <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                                  </div>
                                  <span className="text-gray-300 text-sm leading-relaxed">{highlight}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </DialogContent>
                      </Dialog>
                    ) : (
                      <div className="mb-8"></div>
                    )}
                  </div>

                  {isMillions ? (
                    <button
                      onClick={() => handleSelectPlan(plan)}
                      className="millions-btn w-full py-4 text-base font-black rounded-full relative overflow-hidden transition-all duration-500 group"
                      style={{ background: 'linear-gradient(to right, #2a1f00, #1a1200)', border: '1px solid rgba(212,175,55,0.4)', boxShadow: '0 0 20px rgba(212,175,55,0.15)' }}
                      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 40px rgba(212,175,55,0.4)'; e.currentTarget.style.borderColor = 'rgba(212,175,55,0.8)'; }}
                      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 20px rgba(212,175,55,0.15)'; e.currentTarget.style.borderColor = 'rgba(212,175,55,0.4)'; }}
                    >
                      {/* Hover fill layer */}
                      <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-full"
                        style={{ background: '#000000' }} />
                      <div className="relative z-10 h-6 flex items-center justify-center">
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500 gap-2">
                          <span className="millions-btn-text text-base font-black">Você está pronto?</span>
                          <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center opacity-100 group-hover:opacity-0 transition-opacity duration-500 gap-2">
                          <span className="millions-btn-text text-base font-black">Começar agora</span>
                          <ArrowRight className="w-4 h-4 text-yellow-500" />
                        </div>
                      </div>
                    </button>
                  ) : (
                    <Button 
                      onClick={() => handleSelectPlan(plan)}
                      className={`w-full py-7 text-base font-bold transition-all duration-300 rounded-full border-none group overflow-hidden relative
                        ${isPopular 
                          ? 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-black shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)]' 
                          : 'bg-white hover:bg-gray-100 text-black shadow-lg hover:shadow-xl'
                        }`}
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        Começar agora
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          )})}
        </div>

        {/* Footer Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="flex flex-col items-center text-center mt-20 space-y-8"
        >
          <div className="flex flex-col items-center gap-4">
            <p className="text-gray-400 text-lg font-light">Não tem certeza de qual é o plano ideal?</p>
            <Button variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-full px-8 py-6 backdrop-blur-md transition-all">
              Falar com um consultor
            </Button>
          </div>

          <div className="pt-10 w-full max-w-sm">
            <Button variant="link" onClick={handleSkip} className="text-gray-500 hover:text-white transition-colors duration-300 group">
              Explorar versão gratuita <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}