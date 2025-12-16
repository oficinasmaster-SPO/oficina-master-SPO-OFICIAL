import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";

export default function ActivityTracker({ user, workshop }) {
  const location = useLocation();
  const sessionIdRef = useRef(null);
  const pageStartTimeRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const idleTimeoutRef = useRef(null);
  const isIdleRef = useRef(false);

  // Gerar session ID único
  useEffect(() => {
    if (!user) return;
    
    sessionIdRef.current = `${user.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Criar sessão
    const createSession = async () => {
      try {
        await base44.entities.UserSession.create({
          user_id: user.id,
          user_email: user.email,
          user_name: user.full_name || user.email,
          workshop_id: workshop?.id || null,
          session_id: sessionIdRef.current,
          login_time: new Date().toISOString(),
          last_activity_time: new Date().toISOString(),
          device_info: {
            browser: navigator.userAgent,
            os: navigator.platform,
            screen_resolution: `${window.screen.width}x${window.screen.height}`
          }
        });
      } catch (error) {
        console.error("Error creating session:", error);
      }
    };

    createSession();

    // Cleanup ao desmontar
    return () => {
      if (sessionIdRef.current) {
        endSession();
      }
    };
  }, [user?.id]);

  // Rastrear mudanças de página
  useEffect(() => {
    if (!user || !sessionIdRef.current) return;

    const logPageView = async () => {
      const now = Date.now();
      
      // Calcular tempo na página anterior
      if (pageStartTimeRef.current) {
        const timeSpent = Math.floor((now - pageStartTimeRef.current) / 1000);
        
        try {
          await base44.entities.UserActivityLog.create({
            user_id: user.id,
            user_email: user.email,
            user_name: user.full_name || user.email,
            workshop_id: workshop?.id || null,
            activity_type: "page_view",
            page_url: location.pathname,
            page_name: getPageName(location.pathname),
            time_spent_seconds: timeSpent,
            session_id: sessionIdRef.current,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error("Error logging page view:", error);
        }
      }

      pageStartTimeRef.current = now;
      updateLastActivity();
    };

    logPageView();
  }, [location.pathname, user?.id]);

  // Detectar atividade do usuário
  useEffect(() => {
    if (!user) return;

    const resetIdleTimer = () => {
      lastActivityRef.current = Date.now();
      
      if (isIdleRef.current) {
        isIdleRef.current = false;
        logIdleEnd();
      }

      // Limpar timeout anterior
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }

      // Considerar idle após 5 minutos sem atividade
      idleTimeoutRef.current = setTimeout(() => {
        if (!isIdleRef.current) {
          isIdleRef.current = true;
          logIdleStart();
        }
      }, 5 * 60 * 1000);
    };

    // Eventos de atividade
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      window.addEventListener(event, resetIdleTimer);
    });

    resetIdleTimer();

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, resetIdleTimer);
      });
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
    };
  }, [user?.id]);

  const updateLastActivity = async () => {
    if (!sessionIdRef.current || !user) return;

    try {
      const sessions = await base44.entities.UserSession.filter({
        session_id: sessionIdRef.current
      });

      if (sessions.length > 0) {
        await base44.entities.UserSession.update(sessions[0].id, {
          last_activity_time: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error("Error updating activity:", error);
    }
  };

  const logIdleStart = async () => {
    if (!user || !sessionIdRef.current) return;

    try {
      await base44.entities.UserActivityLog.create({
        user_id: user.id,
        user_email: user.email,
        activity_type: "idle_start",
        session_id: sessionIdRef.current,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error logging idle:", error);
    }
  };

  const logIdleEnd = async () => {
    if (!user || !sessionIdRef.current) return;

    try {
      await base44.entities.UserActivityLog.create({
        user_id: user.id,
        user_email: user.email,
        activity_type: "idle_end",
        session_id: sessionIdRef.current,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error logging idle end:", error);
    }
  };

  const endSession = async () => {
    try {
      const sessions = await base44.entities.UserSession.filter({
        session_id: sessionIdRef.current
      });

      if (sessions.length > 0) {
        const session = sessions[0];
        const now = new Date();
        const loginTime = new Date(session.login_time);
        const totalSeconds = Math.floor((now - loginTime) / 1000);

        await base44.entities.UserSession.update(session.id, {
          logout_time: now.toISOString(),
          total_time_seconds: totalSeconds,
          is_active: false
        });
      }
    } catch (error) {
      console.error("Error ending session:", error);
    }
  };

  const getPageName = (pathname) => {
    const segments = pathname.split('/').filter(Boolean);
    return segments.length > 0 ? segments[segments.length - 1] : 'Home';
  };

  return null; // Componente invisível
}