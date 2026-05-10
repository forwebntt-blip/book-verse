import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getAuthMe, login, logout, register, updateAccountProfile } from "../lib/api";
import type { AuthenticatedUserDto } from "../types/api";

type AuthStatus = "loading" | "ready";

interface AuthContextValue {
  status: AuthStatus;
  isAuthenticated: boolean;
  user: AuthenticatedUserDto | null;
  refreshAuth: () => Promise<void>;
  loginUser: (input: { email: string; password: string; returnTo?: string }) => Promise<AuthenticatedUserDto>;
  registerUser: (input: {
    email: string;
    fullName: string;
    password: string;
    phoneNumber?: string;
    returnTo?: string;
  }) => Promise<AuthenticatedUserDto>;
  updateProfile: (input: { fullName: string; phoneNumber?: string }) => Promise<void>;
  logoutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthenticatedUserDto | null>(null);

  const refreshAuth = async () => {
    const me = await getAuthMe();
    setUser(me.isAuthenticated ? me.user : null);
    setStatus("ready");
  };

  useEffect(() => {
    void refreshAuth().catch(() => {
      setUser(null);
      setStatus("ready");
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      isAuthenticated: Boolean(user),
      user,
      refreshAuth,
      loginUser: async (input) => {
        const result = await login(input);
        setUser(result.user);
        setStatus("ready");
        return result.user;
      },
      registerUser: async (input) => {
        const result = await register(input);
        setUser(result.user);
        setStatus("ready");
        return result.user;
      },
      updateProfile: async (input) => {
        await updateAccountProfile(input);
        await refreshAuth();
      },
      logoutUser: async () => {
        await logout();
        setUser(null);
        setStatus("ready");
      },
    }),
    [status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
