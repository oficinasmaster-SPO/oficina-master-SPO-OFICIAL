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
      
      try {
        // Disparar as duas requisições em paralelo quando há token
        if (appParams.token) {
          const [publicSettings] = await Promise.all([
            appClient.get(`/prod/public-settings/by-id/${appParams.appId}`),
            checkUserAuth()
          ]);
          setAppPublicSettings(publicSettings);
        } else {
          const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
          setAppPublicSettings(publicSettings);
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
        }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);
        
        // Handle app-level errors
        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          if (reason === 'auth_required') {
            setAuthError({
              type: 'auth_required',
              message: 'Authentication required'
            });
          } else if (reason === 'user_not_registered') {
            setAuthError({
              type: 'user_not_registered',
              message: 'User not registered for this app'
            });
          } else {
            setAuthError({
              type: reason,
              message: appError.message
            });
          }
        } else {
          setAuthError({
            type: 'unknown',
            message: appError.message || 'Failed to load app'
          });
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
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
        // Se o app é público e não há token, simplesmente marcar como não autenticado
        if (meError?.status === 401) {
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
          return;
        }
        throw meError;
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
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      
      // SYNC-03: distinguir 403 de sessão expirada vs 403 de rate limit ou permissão
      // Só deslogar em 401 ou em 403 com reason: auth_required
      if (error.status === 401) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      } else if (error.status === 403) {
        // Verificar se é realmente problema de auth ou apenas permissão/rate limit
        const reason = error.data?.extra_data?.reason || error.data?.error || '';
        const isAuthError = reason === 'auth_required' || reason === 'token_expired' || reason === 'invalid_token';
        if (isAuthError) {
          setAuthError({
            type: 'auth_required',
            message: 'Authentication required'
          });
        }
        // 403 de rate limit ou admin-only: ignorar — não deslogar
      }
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