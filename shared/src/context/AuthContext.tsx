import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Role } from '../types';
import { api } from '../services/api';
import { initAndRegisterFcmToken } from '../utils/fcm';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  requestAccess: (payload: { name: string; email: string; requestedRole: Role; companyName?: string }) => Promise<{ message: string }>;
  logout: () => void;
  quickSwitchAccount: (email: string, password?: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => api.getToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async () => {
    const savedToken = api.getToken();
    if (!savedToken) {
      api.setAuthToken(null);
      setToken(null);
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      api.setAuthToken(savedToken);
      const res = await api.getMe();
      setToken(savedToken);
      setUser(res.user);
    } catch {
      api.setAuthToken(null);
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    const handleUnauthorized = () => {
      setToken(null);
      setUser(null);
    };
    window.addEventListener('pms:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('pms:unauthorized', handleUnauthorized);
  }, []);

  const login = async (email: string, password?: string) => {
    setIsLoading(true);
    try {
      let pwd = password;
      if (!pwd) {
        if (email.includes('alex') || email.includes('sarah') || email.includes('admin')) {
          pwd = 'Admin@123';
        } else if (email.includes('jonathan') || email.includes('client') || email.includes('acme')) {
          pwd = 'Client@123';
        } else {
          pwd = 'User@123';
        }
      }
      const response = await api.login({ email, password: pwd });
      api.setAuthToken(response.token);
      setToken(response.token);
      setUser({
        ...response.user,
        mustChangePassword: response.user.mustChangePassword ?? (response as any).mustChangePassword ?? false,
      });

      // Request notification permission and register user's FCM token
      initAndRegisterFcmToken().catch((e) => console.info('[FCM] Token registration:', e?.message || e));
    } finally {
      setIsLoading(false);
    }
  };

  const requestAccess = async (payload: { name: string; email: string; requestedRole: Role; companyName?: string }) => {
    setIsLoading(true);
    try {
      const response = await api.requestAccess(payload);
      return response;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    api.setAuthToken(null);
    setToken(null);
    setUser(null);
  };

  const quickSwitchAccount = async (email: string, password?: string) => {
    await login(email, password);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        requestAccess,
        logout,
        quickSwitchAccount,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
