import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';
import { getEffectiveUser } from '@/components/hooks/useImpersonation';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      
      // First, check app public settings (with token if available)
      // This will tell us if auth is required, user not registered, etc.
      const appClient = createAxiosClient({
        baseURL: `${appParams.serverUrl}/api/apps/public`,
        headers: {
          'X-App-Id': appParams.appId
        },
        token: appParams.token, // Include token if available
        interceptResponses: true
      });
      
      // Sempre buscar public settings primeiro (nunca requer auth)
      let publicSettings = null;
      try {
        publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
        setAppPublicSettings(publicSettings);
      } catch (settingsError) {
        // Se falhar nas public settings, só logar — não bloquear o app
        console.error('Failed to load public settings:', settingsError);
      }
      setIsLoadingPublicSettings(false);

      // Tentar autenticar apenas se há token disponível
      if (appParams.token) {
        await checkUserAuth();
      } else {
        setIsLoadingAuth(false);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      // Now check if the user is authenticated
      setIsLoadingAuth(true);
      let currentUser;
      try {
        currentUser = await base44.auth.me();
      } catch (meError) {
        // Token inválido/expirado = não autenticado, redirecionar para login normalmente
        setIsLoadingAuth(false);
        setIsAuthenticated(false);
        return;
      }
      
      if (!currentUser) {
        setIsLoadingAuth(false);
        setIsAuthenticated(false);
        return;
      }

      // Aplicar impersonação se ativo
      const effectiveUser = getEffectiveUser(currentUser);
      
      if (effectiveUser.role !== 'admin' && !effectiveUser._isImpersonated) {
        try {
          const employees = await base44.entities.Employee.filter({ user_id: effectiveUser.id });
          if (employees && employees.length > 0) {
            const hasActiveEmployee = employees.some(emp => emp.status !== 'inativo');
            if (!hasActiveEmployee) {
              setAuthError({
                type: 'account_inactive',
                message: 'Seu usuário está inativado no sistema. Por favor, procure o administrador da sua empresa para reativar seu acesso.'
              });
              setIsLoadingAuth(false);
              setIsAuthenticated(false);
              return;
            }
          }
        } catch (err) {
          console.error('Error checking employee status:', err);
        }
      }

      setUser(effectiveUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
    } catch (error) {
      console.error('User auth check failed:', error);
      // Qualquer erro no checkUserAuth = não autenticado, mas NÃO bloquear com authError
      // O ProtectedRoute vai redirecionar para /login normalmente
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setUser(null);
      // Só setar authError para erros de conta (inativo, não registrado) — nunca para 401/token expirado
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    
    if (shouldRedirect) {
      // Use the SDK's logout method which handles token cleanup and redirect
      base44.auth.logout(window.location.href);
    } else {
      // Just remove the token without redirect
      base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    // Use the SDK's redirectToLogin method
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};