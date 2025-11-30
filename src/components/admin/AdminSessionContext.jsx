import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const AdminSessionContext = createContext({});

export function AdminSessionProvider({ children }) {
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkActiveSession();
  }, []);

  const checkActiveSession = async () => {
    try {
      const authenticated = await base44.auth.isAuthenticated();
      if (!authenticated) {
        setIsLoading(false);
        return;
      }

      const user = await base44.auth.me();
      if (!user) {
        setIsLoading(false);
        return;
      }

      // Busca sessão ativa no banco
      const sessions = await base44.entities.AdminAccessSession.filter({
        admin_user_id: user.id,
        is_active: true
      });

      if (sessions && sessions.length > 0) {
        const activeSession = sessions[0];
        const now = new Date();
        const expiresAt = new Date(activeSession.expires_at);

        if (expiresAt > now) {
          setSession(activeSession);
          // Buscar detalhes da oficina para exibir no banner
          try {
            const workshopRecord = await base44.entities.Workshop.get(activeSession.workshop_id);
            const ws = Array.isArray(workshopRecord) ? workshopRecord[0] : workshopRecord;
            setSession(prev => ({ ...prev, workshopName: ws?.name || 'Oficina' }));
          } catch (e) {
            console.error("Erro ao buscar oficina da sessão", e);
          }
        } else {
          // Sessão expirada
          await endSession(activeSession.id);
        }
      }
    } catch (error) {
      console.error("Erro ao verificar sessão admin:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const startSession = async (workshopId, reason, durationMinutes) => {
    try {
      const response = await base44.functions.invoke('startAdminSession', {
        workshop_id: workshopId,
        reason,
        duration_minutes: durationMinutes
      });
      
      if (response.data.session) {
        setSession(response.data.session);
        // Atualizar detalhes da oficina
        try {
          const workshopRecord = await base44.entities.Workshop.get(workshopId);
          const ws = Array.isArray(workshopRecord) ? workshopRecord[0] : workshopRecord;
          setSession(prev => ({ ...prev, workshopName: ws?.name }));
        } catch (e) {}
        
        toast.success("Sessão Modo Master iniciada");
        return true;
      } else {
        toast.error(response.data.error || "Erro ao iniciar sessão");
        return false;
      }
    } catch (error) {
      toast.error("Erro ao iniciar sessão: " + error.message);
      return false;
    }
  };

  const endSession = async (sessionId) => {
    const id = sessionId || session?.id;
    if (!id) return;

    try {
      await base44.functions.invoke('endAdminSession', { session_id: id });
      setSession(null);
      toast.success("Sessão Modo Master encerrada");
      
      // Opcional: Redirecionar para lista master se estiver em uma tela da oficina
      if (window.location.pathname !== '/admin-master') {
        window.location.href = '/admin-master';
      }
    } catch (error) {
      console.error("Erro ao encerrar sessão:", error);
    }
  };

  return (
    <AdminSessionContext.Provider value={{ session, isLoading, startSession, endSession }}>
      {children}
    </AdminSessionContext.Provider>
  );
}

export const useAdminSession = () => useContext(AdminSessionContext);