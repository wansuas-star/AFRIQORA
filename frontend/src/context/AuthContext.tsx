import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authApi, getStoredToken, setStoredToken } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      if (!getStoredToken()) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      const data = await authApi.getProfile();
      setUser(data.user);
    } catch (err) {
      console.error('Failed to load user profile:', err);
      setUser(null);
      setStoredToken(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, [token]);

  const login = async (email: string, pass: string) => {
    const res = await authApi.login(email, pass);
    setStoredToken(res.token);
    setToken(res.token);
    setUser(res.user);
  };

  const register = async (email: string, pass: string, name: string) => {
    const res = await authApi.register(email, pass, name);
    setStoredToken(res.token);
    setToken(res.token);
    setUser(res.user);
  };

  const logout = () => {
    setStoredToken(null);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
