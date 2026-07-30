import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { loginUser, registerUser, type UserResponse } from '../lib/api';

interface AuthContextValue {
  user: UserResponse | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = 'hackathon_mini_auth';

interface StoredAuth {
  token: string;
  user: UserResponse;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as StoredAuth;
      setToken(parsed.token);
      setUser(parsed.user);
    }
    setIsLoading(false);
  }, []);

  const persist = (nextToken: string, nextUser: UserResponse) => {
    setToken(nextToken);
    setUser(nextUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: nextToken, user: nextUser }));
  };

  const login = async (email: string, password: string) => {
    const data = await loginUser({ email, password });
    persist(data.access_token, data.user);
  };

  const register = async (email: string, password: string, name: string) => {
    const data = await registerUser({ email, password, name });
    persist(data.access_token, data.user);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
