import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { createApi } from "../api";
const storageKey = "shelflife.token";
type Auth = {
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
  api: ReturnType<typeof createApi>;
};
const AuthContext = createContext<Auth | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(() => sessionStorage.getItem(storageKey));
  const login = useCallback((value: string) => {
    sessionStorage.setItem(storageKey, value);
    setToken(value);
  }, []);
  const logout = useCallback(() => {
    sessionStorage.removeItem(storageKey);
    setToken(null);
  }, []);
  const api = useMemo(
    () =>
      createApi(token, () => {
        if (sessionStorage.getItem(storageKey) === token) logout();
      }),
    [token, logout],
  );
  return (
    <AuthContext.Provider value={{ token, login, logout, api }}>
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("Authentication provider is missing");
  return auth;
}
