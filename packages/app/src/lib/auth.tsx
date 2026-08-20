import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { api } from "./api";
import type { Vendor } from "./types";

interface AuthContextValue {
  vendor: Vendor | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api<Vendor>("/auth/me")
      .then((data) => setVendor(data))
      .catch(() => setVendor(null))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api<Vendor>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    setVendor(data);
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const data = await api<Vendor>("/auth/register", {
        method: "POST",
        body: { name, email, password },
      });
      setVendor(data);
    },
    []
  );

  const logout = useCallback(async () => {
    await api("/auth/logout", { method: "POST" });
    setVendor(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ vendor, isLoading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}