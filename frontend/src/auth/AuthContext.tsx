import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { clearToken, getToken, setToken, setUnauthorizedHandler } from '../api/client';
import { loginRequest, meRequest } from '../api/auth.api';
import type { AuthUser } from '../types/auth';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    setStatus('unauthenticated');
    navigate('/login', { replace: true });
  }, [navigate]);

  // Reacciona a 401 globales (token expirado/inválido) disparados por el interceptor de axios.
  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  // Sesión persistida: si hay token guardado, valida contra /auth/me al arrancar.
  useEffect(() => {
    let cancelled = false;
    if (!getToken()) {
      setStatus('unauthenticated');
      return;
    }
    meRequest()
      .then((loadedUser) => {
        if (!cancelled) {
          setUser(loadedUser);
          setStatus('authenticated');
        }
      })
      .catch(() => {
        if (!cancelled) {
          clearToken();
          setUser(null);
          setStatus('unauthenticated');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { accessToken, user: loggedUser } = await loginRequest(email, password);
    setToken(accessToken);
    setUser(loggedUser);
    setStatus('authenticated');
    return loggedUser;
  }, []);

  const value = useMemo(
    () => ({ user, status, login, logout }),
    [user, status, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
